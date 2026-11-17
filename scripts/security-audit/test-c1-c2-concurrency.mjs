/**
 * VEXOR — ETAPA 9.1.3.7: TESTES REAIS C1 E C2 (RPCs ADMINISTRATIVAS ORIGINAIS)
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

const ADMIN_A = '91370001-0000-0000-0000-000000000001';
const ADMIN_B = '91370001-0000-0000-0000-000000000002';
const TARGET_1 = '91370001-0000-0000-0000-000000000003';
const TARGET_2 = '91370001-0000-0000-0000-000000000004';

async function captureLocks(observer, pids) {
  const res = await observer.exec(
    `SELECT pid || '|' || locktype || '|' || coalesce(relation::regclass::text,'') || '|' || mode || '|' || granted FROM pg_locks WHERE pid IN (${pids.join(',')}) ORDER BY pid, granted DESC, locktype;`
  );
  return res.stdout ? res.stdout.split('\n').filter(Boolean) : [];
}

async function setupTempUsers(obs) {
  await obs.exec(`DELETE FROM auth.users WHERE id IN ('${ADMIN_A}','${ADMIN_B}','${TARGET_1}','${TARGET_2}');`);
  await obs.exec(`
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
      ('${ADMIN_A}', 'tmp_admin_a@vexor.local', '{"username":"tmp_admin_a"}'),
      ('${ADMIN_B}', 'tmp_admin_b@vexor.local', '{"username":"tmp_admin_b"}'),
      ('${TARGET_1}', 'tmp_target_1@vexor.local', '{"username":"tmp_target_1"}'),
      ('${TARGET_2}', 'tmp_target_2@vexor.local', '{"username":"tmp_target_2"}');
    UPDATE public.profiles SET role = 'admin' WHERE id IN ('${ADMIN_A}', '${ADMIN_B}');
  `);
}

async function main() {
  const { startedByUs } = await ensureLocalPostgresRunning();
  const identity = await verifyServerIdentity();
  console.log('=== SERVER IDENTITY ===', JSON.stringify(identity));

  const obs = new InteractivePsqlSession('OBS');
  const sessA = new InteractivePsqlSession('A');
  const sessB = new InteractivePsqlSession('B');
  const outPath = path.join(projectRoot, 'scripts/security-audit/result-c1-c2.json');
  const output = { identity };
  const saveProgress = () => fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  try {
    await obs.connect();
    await sessA.connect();
    await sessB.connect();

    await setupTempUsers(obs);
    saveProgress();

    // =========================================================================
    // C1-A: admin_set_user_role vs CASCADE DELETE em auth.users
    // =========================================================================
    await sessA.exec('BEGIN;');
    const delA = await sessA.exec(`DELETE FROM auth.users WHERE id = '${ADMIN_B}';`);
    const locksA_c1 = await captureLocks(obs, [sessA.pid]);

    await sessB.exec('BEGIN;');
    await sessB.exec(`SET LOCAL ROLE authenticated;`);
    await sessB.exec(`SELECT set_config('request.jwt.claim.sub', '${ADMIN_A}', true), set_config('request.jwt.claim.role', 'authenticated', true);`);

    const rpcPromiseC1 = sessB.exec(`SELECT public.admin_set_user_role('${ADMIN_B}', 'member');`);
    const blockedLineC1 = await waitUntilBlocked(obs, sessB.pid, 5000);
    const locksBothC1 = await captureLocks(obs, [sessA.pid, sessB.pid]);

    const commitAC1 = await sessA.exec('COMMIT;');
    const rpcResC1 = await rpcPromiseC1;
    await sessB.exec('ROLLBACK;');

    const profileExistsAfterC1 = (await obs.exec(`SELECT count(*) FROM public.profiles WHERE id = '${ADMIN_B}';`)).stdout;

    output.c1_role_vs_cascade = {
      pidA: sessA.pid,
      pidB: sessB.pid,
      deleteA_stdout: delA.stdout,
      locksA_before_B: locksA_c1,
      blockedLine_during_wait: blockedLineC1,
      locks_during_wait: locksBothC1,
      commitA: commitAC1.stdout || 'COMMIT',
      rpcB_result: rpcResC1,
      profileExistsAfterCascade: Number(profileExistsAfterC1)
    };
    saveProgress();

    // =========================================================================
    // C1-B: admin_set_user_suspension vs CASCADE DELETE em auth.users
    // =========================================================================
    await sessA.exec('BEGIN;');
    await sessA.exec(`DELETE FROM auth.users WHERE id = '${TARGET_2}';`);

    await sessB.exec('BEGIN;');
    await sessB.exec(`SET LOCAL ROLE authenticated;`);
    await sessB.exec(`SELECT set_config('request.jwt.claim.sub', '${ADMIN_A}', true), set_config('request.jwt.claim.role', 'authenticated', true);`);

    const rpcPromiseC1Susp = sessB.exec(`SELECT public.admin_set_user_suspension('${TARGET_2}', true, 'audit test');`);
    const blockedLineC1Susp = await waitUntilBlocked(obs, sessB.pid, 5000);
    const commitAC1Susp = await sessA.exec('COMMIT;');
    const rpcResC1Susp = await rpcPromiseC1Susp;
    await sessB.exec('ROLLBACK;');
    const target2ExistsAfter = (await obs.exec(`SELECT count(*) FROM public.profiles WHERE id = '${TARGET_2}';`)).stdout;

    output.c1_suspension_vs_cascade = {
      blockedLine_during_wait: blockedLineC1Susp,
      commitA: commitAC1Susp.stdout || 'COMMIT',
      rpcB_result: rpcResC1Susp,
      profileExistsAfterCascade: Number(target2ExistsAfter)
    };
    saveProgress();

    // =========================================================================
    // C2: Exclusão concorrente do administrador chamador (ADMIN_B)
    // =========================================================================
    await obs.exec(`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES ('${ADMIN_B}', 'tmp_admin_b@vexor.local', '{"username":"tmp_admin_b"}')
      ON CONFLICT (id) DO NOTHING;
      UPDATE public.profiles SET role = 'admin' WHERE id = '${ADMIN_B}';
    `);

    await sessA.exec('BEGIN;');
    const delCallerA = await sessA.exec(`DELETE FROM auth.users WHERE id = '${ADMIN_B}';`);
    const locksA_c2 = await captureLocks(obs, [sessA.pid]);

    await sessB.exec('BEGIN;');
    await sessB.exec(`SET LOCAL ROLE authenticated;`);
    await sessB.exec(`SELECT set_config('request.jwt.claim.sub', '${ADMIN_B}', true), set_config('request.jwt.claim.role', 'authenticated', true);`);
    const rpcPromiseC2 = sessB.exec(`SELECT public.admin_set_user_role('${TARGET_1}', 'moderator');`);
    const blockedLineC2 = await waitUntilBlocked(obs, sessB.pid, 5000);
    const locksBothC2 = await captureLocks(obs, [sessA.pid, sessB.pid]);

    const commitAC2 = await sessA.exec('COMMIT;');
    const rpcResC2 = await rpcPromiseC2;
    const endBC2 = rpcResC2.hasError ? await sessB.exec('ROLLBACK;') : await sessB.exec('COMMIT;');

    const target1RoleAfterC2 = (await obs.exec(`SELECT role FROM public.profiles WHERE id = '${TARGET_1}';`)).stdout;
    const callerExistsAfterC2 = (await obs.exec(`SELECT count(*) FROM public.profiles WHERE id = '${ADMIN_B}';`)).stdout;

    output.c2_caller_deletion_concurrent = {
      pidA: sessA.pid,
      pidB: sessB.pid,
      deleteCallerA: delCallerA.stdout,
      locksA_before_B: locksA_c2,
      blockedLine_during_wait: blockedLineC2,
      locks_during_wait: locksBothC2,
      commitA: commitAC2.hasError ? commitAC2.stderr : 'COMMIT',
      rpcB_result: rpcResC2,
      sessionB_end: endBC2.hasError ? endBC2.stderr : (rpcResC2.hasError ? 'ROLLBACK' : 'COMMIT'),
      target1RoleAfterC2,
      callerExistsAfterC2: Number(callerExistsAfterC2)
    };
    saveProgress();
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await sessA.safeRollback();
    await sessB.safeRollback();
    try {
      await obs.exec(`DELETE FROM auth.users WHERE id IN ('${ADMIN_A}','${ADMIN_B}','${TARGET_1}','${TARGET_2}');`, 5000);
    } catch { /* ignore */ }
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
