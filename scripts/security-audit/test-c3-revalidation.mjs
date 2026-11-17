/**
 * VEXOR — ETAPA 9.1.3.7: TESTE REAL C3 (REVALIDAÇÃO DE AUTORIZAÇÃO EM DUAS SESSÕES)
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

const ADMIN_A = '91370003-0000-0000-0000-000000000001';
const ADMIN_B = '91370003-0000-0000-0000-000000000002';
const TARGET_1 = '91370003-0000-0000-0000-000000000003';

async function main() {
  const { startedByUs } = await ensureLocalPostgresRunning();
  const identity = await verifyServerIdentity();

  const obs = new InteractivePsqlSession('OBS');
  const sessA = new InteractivePsqlSession('A');
  const sessB = new InteractivePsqlSession('B');
  const sessC = new InteractivePsqlSession('C');

  try {
    await obs.connect();
    await sessA.connect();
    await sessB.connect();
    await sessC.connect();

    await obs.exec(`DELETE FROM auth.users WHERE id IN ('${ADMIN_A}','${ADMIN_B}','${TARGET_1}');`);
    await obs.exec(`
      INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
        ('${ADMIN_A}', 'c3_admin_a@vexor.local', '{"username":"c3_admin_a"}'),
        ('${ADMIN_B}', 'c3_admin_b@vexor.local', '{"username":"c3_admin_b"}'),
        ('${TARGET_1}', 'c3_target_1@vexor.local', '{"username":"c3_target_1"}');
      UPDATE public.profiles SET role = 'admin' WHERE id IN ('${ADMIN_A}', '${ADMIN_B}');
    `);

    // Parte 1: Revogação sequencial antes da chamada de B
    await sessA.exec('BEGIN;');
    await sessA.exec('SET LOCAL ROLE authenticated;');
    await sessA.exec(`SELECT set_config('request.jwt.claim.sub', '${ADMIN_A}', true), set_config('request.jwt.claim.role', 'authenticated', true);`);
    const demoteSeq = await sessA.exec(`SELECT public.admin_set_user_role('${ADMIN_B}', 'member');`);
    await sessA.exec('COMMIT;');

    await sessB.exec('BEGIN;');
    await sessB.exec('SET LOCAL ROLE authenticated;');
    await sessB.exec(`SELECT set_config('request.jwt.claim.sub', '${ADMIN_B}', true), set_config('request.jwt.claim.role', 'authenticated', true);`);
    const callAfterDemoteSeq = await sessB.exec(`SELECT public.admin_set_user_role('${TARGET_1}', 'moderator');`);
    await sessB.exec('ROLLBACK;');

    // Parte 2: Corrida real — B passa na checagem inicial, trava no FOR UPDATE, C rebaixa B e commita, A libera lock
    await obs.exec(`UPDATE public.profiles SET role = 'admin' WHERE id = '${ADMIN_B}'; UPDATE public.profiles SET role = 'member' WHERE id = '${TARGET_1}';`);

    await sessA.exec('BEGIN;');
    await sessA.exec(`UPDATE public.profiles SET bio = 'holding row lock on target' WHERE id = '${TARGET_1}';`);

    await sessB.exec('BEGIN;');
    await sessB.exec('SET LOCAL ROLE authenticated;');
    await sessB.exec(`SELECT set_config('request.jwt.claim.sub', '${ADMIN_B}', true), set_config('request.jwt.claim.role', 'authenticated', true);`);
    const rpcPromiseB = sessB.exec(`SELECT public.admin_set_user_role('${TARGET_1}', 'moderator');`);

    const blockedLine = await waitUntilBlocked(obs, sessB.pid, 5000);

    // Enquanto B aguarda lock em TARGET_1, Sessão C (ADMIN_A) rebaixa ADMIN_B para 'member' e commita
    await sessC.exec('BEGIN;');
    await sessC.exec('SET LOCAL ROLE authenticated;');
    await sessC.exec(`SELECT set_config('request.jwt.claim.sub', '${ADMIN_A}', true), set_config('request.jwt.claim.role', 'authenticated', true);`);
    const demoteWhileWaiting = await sessC.exec(`SELECT public.admin_set_user_role('${ADMIN_B}', 'member');`);
    const commitC = await sessC.exec('COMMIT;');

    const adminBRoleBeforeBUnblocks = (await obs.exec(`SELECT role FROM public.profiles WHERE id = '${ADMIN_B}';`)).stdout;

    // Sessão A libera o lock de TARGET_1
    await sessA.exec('COMMIT;');
    const rpcResB = await rpcPromiseB;
    const commitB = await sessB.exec('COMMIT;');

    const targetRoleAfter = (await obs.exec(`SELECT role FROM public.profiles WHERE id = '${TARGET_1}';`)).stdout;
    const adminBRoleAfter = (await obs.exec(`SELECT role FROM public.profiles WHERE id = '${ADMIN_B}';`)).stdout;

    const output = {
      identity,
      part1_sequential_after_demotion: {
        demoteA_error: demoteSeq.hasError,
        callB_result: callAfterDemoteSeq
      },
      part2_concurrent_prelock_no_revalidation: {
        pidA_lock_holder: sessA.pid,
        pidB_caller: sessB.pid,
        pidC_revoker: sessC.pid,
        blockedLine_B_waiting_on_A: blockedLine,
        demoteC_while_B_waiting_hasError: demoteWhileWaiting.hasError,
        commitC: commitC.hasError ? commitC.stderr : 'COMMIT',
        adminBRoleBeforeBUnblocks,
        rpcResB_after_unblock: rpcResB,
        commitB: commitB.hasError ? commitB.stderr : 'COMMIT',
        adminBRoleAfter,
        targetRoleAfter
      }
    };

    fs.writeFileSync(path.join(projectRoot, 'scripts/security-audit/result-c3.json'), JSON.stringify(output, null, 2));
    console.log(JSON.stringify(output, null, 2));

    await obs.exec(`DELETE FROM auth.users WHERE id IN ('${ADMIN_A}','${ADMIN_B}','${TARGET_1}');`);
  } finally {
    await obs.close();
    await sessA.close();
    await sessB.close();
    await sessC.close();
    await stopLocalPostgresIfStarted(startedByUs);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
