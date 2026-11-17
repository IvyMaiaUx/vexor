/**
 * VEXOR — ETAPA 9.1.3.7: TESTE C6 (REPRODUÇÃO DETERMINÍSTICA DE DEADLOCK 40P01)
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  ensureLocalPostgresRunning,
  stopLocalPostgresIfStarted,
  verifyServerIdentity,
  InteractivePsqlSession,
  waitUntilBlocked,
  projectRoot
} from './pg-session-helper.mjs';

async function main() {
  const { startedByUs } = await ensureLocalPostgresRunning();
  const identity = await verifyServerIdentity();

  const obs = new InteractivePsqlSession('OBS');
  const sessA = new InteractivePsqlSession('A');
  const sessB = new InteractivePsqlSession('B');

  try {
    await obs.connect();
    await sessA.connect();
    await sessB.connect();

    await obs.exec(`
      DROP TABLE IF EXISTS public._audit_deadlock_test;
      CREATE TABLE public._audit_deadlock_test (id int PRIMARY KEY, val text NOT NULL);
      INSERT INTO public._audit_deadlock_test VALUES (1, 'recurso_X'), (2, 'recurso_Y');
    `);

    const tAcquireX = new Date().toISOString();
    await sessA.exec('BEGIN;');
    await sessA.exec(`UPDATE public._audit_deadlock_test SET val = 'A_locked_X' WHERE id = 1;`);

    const tAcquireY = new Date().toISOString();
    await sessB.exec('BEGIN;');
    await sessB.exec(`UPDATE public._audit_deadlock_test SET val = 'B_locked_Y' WHERE id = 2;`);

    const heldLocks = (await obs.exec(
      `SELECT pid || '|' || locktype || '|' || coalesce(relation::regclass::text,'') || '|' || mode || '|' || granted FROM pg_locks WHERE pid IN (${sessA.pid}, ${sessB.pid}) AND locktype IN ('relation','tuple','transactionid') ORDER BY pid, locktype;`
    )).stdout.split('\n').filter(Boolean);

    const tWaitY = new Date().toISOString();
    const promiseA = sessA.exec(`UPDATE public._audit_deadlock_test SET val = 'A_wants_Y' WHERE id = 2;`);

    // Barreira explícita: aguarda PostgreSQL confirmar que Sessão A está bloqueada em Lock esperando Sessão B
    const waitingA = await waitUntilBlocked(obs, sessA.pid, 5000);
    const waitingLocks = (await obs.exec(
      `SELECT pid || '|' || locktype || '|' || coalesce(relation::regclass::text,'') || '|' || mode || '|' || granted FROM pg_locks WHERE pid IN (${sessA.pid}, ${sessB.pid}) AND NOT granted;`
    )).stdout.split('\n').filter(Boolean);

    const tStartCycleMs = Date.now();
    const tRequestX = new Date().toISOString();
    const promiseB = sessB.exec(`UPDATE public._audit_deadlock_test SET val = 'B_wants_X' WHERE id = 1;`);

    // Aguarda a primeira das duas sessões ser abortada pelo detector de deadlock (40P01)
    const raceWinner = await Promise.race([
      promiseA.then(r => ({ session: 'A', res: r, elapsedMs: Date.now() - tStartCycleMs })),
      promiseB.then(r => ({ session: 'B', res: r, elapsedMs: Date.now() - tStartCycleMs }))
    ]);

    const tDetected = new Date().toISOString();

    const [resA, resB] = await Promise.all([promiseA, promiseB]);

    let finalStateA;
    let finalStateB;
    let victimSession = null;

    if (resA.hasError && !resB.hasError) {
      victimSession = 'A';
      await sessA.exec('ROLLBACK;');
      finalStateA = 'ROLLED_BACK (victim)';
      await sessB.exec('COMMIT;');
      finalStateB = 'COMMITTED (survivor)';
    } else if (resB.hasError && !resA.hasError) {
      victimSession = 'B';
      await sessB.exec('ROLLBACK;');
      finalStateB = 'ROLLED_BACK (victim)';
      await sessA.exec('COMMIT;');
      finalStateA = 'COMMITTED (survivor)';
    } else {
      await sessA.safeRollback();
      await sessB.safeRollback();
      finalStateA = resA.hasError ? 'ROLLED_BACK' : 'ROLLED_BACK (unexpected)';
      finalStateB = resB.hasError ? 'ROLLED_BACK' : 'ROLLED_BACK (unexpected)';
    }

    const finalRows = (await obs.exec(`SELECT id || '|' || val FROM public._audit_deadlock_test ORDER BY id;`)).stdout.split('\n').filter(Boolean);

    await obs.exec(`DROP TABLE IF EXISTS public._audit_deadlock_test;`);

    const output = {
      identity,
      pidA: sessA.pid,
      pidB: sessB.pid,
      timestamps: {
        acquire_X_by_A: tAcquireX,
        acquire_Y_by_B: tAcquireY,
        wait_Y_by_A: tWaitY,
        request_X_by_B: tRequestX,
        deadlock_detected: tDetected,
        detection_elapsed_ms: raceWinner.elapsedMs
      },
      held_locks_before_cycle: heldLocks,
      waiting_query_A: waitingA,
      ungranted_locks_during_wait: waitingLocks,
      victim_session: victimSession,
      sessionA_result: resA,
      sessionB_result: resB,
      final_state_A: finalStateA,
      final_state_B: finalStateB,
      final_table_rows: finalRows
    };

    fs.writeFileSync(path.join(projectRoot, 'scripts/security-audit/result-c6.json'), JSON.stringify(output, null, 2));
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await obs.close();
    await sessA.close();
    await sessB.close();
    await stopLocalPostgresIfStarted(startedByUs);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
