/**
 * VEXOR — ETAPA 9.1.5: APLICAÇÃO CONTROLADA E REGRESSÃO COMPLETA (24 TESTES)
 * Alvo exclusivo: 127.0.0.1:5433 / vexor_audit (.pg_test_cluster)
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  ensureLocalPostgresRunning,
  stopLocalPostgresIfStarted,
  verifyServerIdentity,
  runCommand,
  InteractivePsqlSession,
  waitUntilBlocked,
  PSQL_EXE,
  HOST,
  PORT,
  DB_NAME,
  projectRoot
} from './pg-session-helper.mjs';

const A1 = '91500001-0000-0000-0000-000000000001';
const A2 = '91500001-0000-0000-0000-000000000002';
const MOD1 = '91500001-0000-0000-0000-000000000003';
const MEM1 = '91500001-0000-0000-0000-000000000004';
const SUSP1 = '91500001-0000-0000-0000-000000000005';
const TOPIC1 = '91500001-0000-0000-0000-000000000010';
const CAT1 = '91500001-0000-0000-0000-000000000020';

const results = [];
const outPath = path.join(projectRoot, 'scripts/security-audit/result-9.1.5-regression.json');

function record(id, group, status, sqlstate, details) {
  results.push({ id, group, status, sqlstate: sqlstate || null, details });
  fs.writeFileSync(outPath, JSON.stringify({ results }, null, 2));
  console.log(`[${status}] ${id} (${group}) [SQLSTATE=${sqlstate || 'null'}]: ${details}`);
}

async function setupBaseData(obs) {
  // Remove resíduos de testes anteriores agora que V5 permite exclusão com audit_logs
  await obs.exec(`DELETE FROM public.topics WHERE id = '${TOPIC1}'; DELETE FROM public.categories WHERE id = '${CAT1}';`);
  await obs.exec(`DELETE FROM auth.users WHERE email LIKE '%@vexor.local' OR id IN ('${A1}','${A2}','${MOD1}','${MEM1}','${SUSP1}');`);
  // Garante estado limpo apenas com 1 admin ativo controlado para testes de último admin quando necessário
  await obs.exec(`
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
      ('${A1}', 'r915_a1@vexor.local', '{"username":"r915_a1"}'),
      ('${A2}', 'r915_a2@vexor.local', '{"username":"r915_a2"}'),
      ('${MOD1}', 'r915_mod@vexor.local', '{"username":"r915_mod"}'),
      ('${MEM1}', 'r915_mem@vexor.local', '{"username":"r915_mem"}'),
      ('${SUSP1}', 'r915_susp@vexor.local', '{"username":"r915_susp"}');
    UPDATE public.profiles SET role = 'admin' WHERE id IN ('${A1}', '${A2}');
    UPDATE public.profiles SET role = 'moderator' WHERE id = '${MOD1}';
    UPDATE public.profiles SET is_suspended = true WHERE id = '${SUSP1}';
  `);
}

async function main() {
  const { startedByUs } = await ensureLocalPostgresRunning();
  const identity = await verifyServerIdentity();
  console.log('=== IDENTITY ===', JSON.stringify(identity));

  // Aplica correções experimentais locais
  const applyRes = await runCommand(PSQL_EXE, [
    '-h', HOST, '-p', String(PORT), '-U', 'postgres', '-d', DB_NAME,
    '-X', '-v', 'ON_ERROR_STOP=1',
    '-f', path.join(projectRoot, 'scripts/security-audit/apply-9.1.5-fixes.sql')
  ]);
  if (applyRes.code !== 0) {
    throw new Error(`Falha ao aplicar apply-9.1.5-fixes.sql: ${applyRes.stderr || applyRes.stdout}`);
  }

  const obs = new InteractivePsqlSession('OBS');
  const sA = new InteractivePsqlSession('A');
  const sB = new InteractivePsqlSession('B');
  const sC = new InteractivePsqlSession('C');

  try {
    await obs.connect();
    await sA.connect();
    await sB.connect();
    await sC.connect();

    await setupBaseData(obs);
    // Normaliza outros admins existentes da base para 'member' temporariamente? Não, vamos contar quantos admins existem!
    const baseAdmins = (await obs.exec(`SELECT id FROM public.profiles WHERE role = 'admin' AND NOT is_suspended AND id NOT IN ('${A1}','${A2}');`)).stdout.split('\n').filter(Boolean);
    if (baseAdmins.length > 0) {
      // Suspende temporariamente para isolar o conjunto de 2 admins (A1, A2) nos testes de último admin e restaura ao final
      await obs.exec(`UPDATE public.profiles SET role = 'member' WHERE id IN (${baseAdmins.map(x => `'${x}'`).join(',')});`);
    }

    try {
      // 1. Dois administradores tentando rebaixar um ao outro simultaneamente
      await sA.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sA.exec(`SELECT set_config('request.jwt.claim.sub','${A1}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      await sB.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sB.exec(`SELECT set_config('request.jwt.claim.sub','${A2}',true), set_config('request.jwt.claim.role','authenticated',true);`);

      const pA1 = sA.exec(`SELECT public.admin_set_user_role('${A2}', 'member');`);
      // Aguarda um instante para sA pegar o advisory lock e dispara sB
      await new Promise(r => setTimeout(r, 150));
      const pB1 = sB.exec(`SELECT public.admin_set_user_role('${A1}', 'member');`);
      const rA1 = await pA1;
      await sA.exec('COMMIT;');
      const rB1 = await pB1;
      await sB.safeRollback();
      const activeAfter1 = Number((await obs.exec(`SELECT count(*) FROM public.profiles WHERE role='admin' AND NOT is_suspended;`)).stdout);
      record('T01-MUTUAL-DEMOTE', 'Governanca', (!rA1.hasError && rB1.sqlstate === '42501' && activeAfter1 === 1) ? 'PASS' : 'FAIL', rB1.sqlstate, `A1 ok=${!rA1.hasError}, A2 bloqueado=${rB1.sqlstate}, admins_ativos=${activeAfter1}`);

      // 2. Tentativa de remover/rebaixar o último administrador ativo (apenas A1 ativo agora)
      await obs.exec(`UPDATE public.profiles SET role='admin' WHERE id='${A2}';`); // deixa A2 admin e A1 tenta rebaixar A2? Já testado; agora apenas A1 ativo:
      await obs.exec(`UPDATE public.profiles SET role='member' WHERE id='${A2}';`);
      await sA.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sA.exec(`SELECT set_config('request.jwt.claim.sub','${A1}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      const rT02 = await sA.exec(`SELECT public.admin_set_user_role('${A1}', 'member');`);
      await sA.safeRollback();
      record('T02-DEMOTE-LAST-ADMIN', 'Governanca', rT02.sqlstate === '42501' ? 'PASS' : 'FAIL', rT02.sqlstate, `Bloqueio auto/ultimo admin: ${rT02.stderr.split('\n')[0]}`);

      // 3. Exclusão em cascata de auth.users do último administrador ativo
      const rT03 = await obs.exec(`DELETE FROM auth.users WHERE id = '${A1}';`);
      const a1Exists = Number((await obs.exec(`SELECT count(*) FROM public.profiles WHERE id='${A1}';`)).stdout);
      record('T03-CASCADE-LAST-ADMIN', 'Governanca', (rT03.sqlstate === '42501' && a1Exists === 1) ? 'PASS' : 'FAIL', rT03.sqlstate, `Trigger BEFORE DELETE bloqueou CASCADE: a1Exists=${a1Exists}`);

      // 4. Suspensão do último administrador ativo
      await obs.exec(`UPDATE public.profiles SET role='admin' WHERE id='${A2}';`);
      // A2 tenta suspender A1 quando só A1 e A2? Não, para testar último admin via suspensão, garantimos apenas 1 ativo: A2 é superuser? Não, RPC exige caller admin; se A1 é o único admin, A1 não pode se suspender. Logo trigger/RPC impede último admin em qualquer caso! Vamos testar ambos: A1 tentando se suspender -> 42501, e A2 ativo sendo o último se A1 estiver suspenso!
      await obs.exec(`UPDATE public.profiles SET is_suspended=true WHERE id='${A1}';`);
      await sB.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sB.exec(`SELECT set_config('request.jwt.claim.sub','${A2}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      const rT04 = await sB.exec(`SELECT public.admin_set_user_suspension('${A2}', true, 'test');`);
      await sB.safeRollback();
      await obs.exec(`UPDATE public.profiles SET is_suspended=false WHERE id='${A1}';`);
      record('T04-SUSPEND-LAST-ADMIN', 'Governanca', rT04.sqlstate === '42501' ? 'PASS' : 'FAIL', rT04.sqlstate, `Bloqueio suspensão último admin: ${rT04.stderr.split('\n')[0]}`);

      // 5 & 22. Rebaixamento durante RPC administrativa (C3 eliminado!)
      // sA segura advisory lock via admin_set_user_role(MEM1, 'moderator') sem commitar ainda; sB chama admin_set_user_role(SUSP1, 'moderator') e espera no advisory lock; sA rebaixa A2 dentro da mesma tx e commita!
      await sA.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sA.exec(`SELECT set_config('request.jwt.claim.sub','${A1}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      await sA.exec(`SELECT public.admin_set_user_role('${A2}', 'member');`);

      await sB.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sB.exec(`SELECT set_config('request.jwt.claim.sub','${A2}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      const pB5 = sB.exec(`SELECT public.admin_set_user_role('${MEM1}', 'moderator');`);
      const blk5 = await waitUntilBlocked(obs, sB.pid, 4000);
      await sA.exec('COMMIT;');
      const rB5 = await pB5;
      await sB.safeRollback();
      const memRole5 = (await obs.exec(`SELECT role FROM public.profiles WHERE id='${MEM1}';`)).stdout;
      record('T05-DEMOTE-DURING-RPC-C3', 'Governanca', (blk5 && rB5.sqlstate === '42501' && memRole5 === 'member') ? 'PASS' : 'FAIL', rB5.sqlstate, `C3 bloqueado na revalidação pós-lock; memRole=${memRole5}`);

      // 6. Suspensão durante RPC administrativa
      await obs.exec(`UPDATE public.profiles SET role='admin' WHERE id='${A2}';`);
      await sA.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sA.exec(`SELECT set_config('request.jwt.claim.sub','${A1}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      await sA.exec(`SELECT public.admin_set_user_suspension('${A2}', true, 'concurrent rev');`);

      await sB.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sB.exec(`SELECT set_config('request.jwt.claim.sub','${A2}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      const pB6 = sB.exec(`SELECT public.admin_set_user_role('${MEM1}', 'moderator');`);
      const blk6 = await waitUntilBlocked(obs, sB.pid, 4000);
      await sA.exec('COMMIT;');
      const rB6 = await pB6;
      await sB.safeRollback();
      const memRole6 = (await obs.exec(`SELECT role FROM public.profiles WHERE id='${MEM1}';`)).stdout;
      record('T06-SUSPEND-DURING-RPC', 'Governanca', (blk6 && rB6.sqlstate === '42501' && memRole6 === 'member') ? 'PASS' : 'FAIL', rB6.sqlstate, `Suspensão concorrente bloqueada na revalidação; memRole=${memRole6}`);

      // 7 & 9. Exclusão concorrente do administrador chamador + regressão de deadlock (serialização sem 40P01)
      await obs.exec(`UPDATE public.profiles SET is_suspended=false WHERE id='${A2}';`);
      await sA.exec('BEGIN;');
      await sA.exec(`DELETE FROM auth.users WHERE id = '${A2}';`);
      await sB.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sB.exec(`SELECT set_config('request.jwt.claim.sub','${A2}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      const pB7 = sB.exec(`SELECT public.admin_set_user_role('${MEM1}', 'moderator');`);
      const blk7 = await waitUntilBlocked(obs, sB.pid, 4000);
      await sA.exec('COMMIT;');
      const rB7 = await pB7;
      await sB.safeRollback();
      const memRole7 = (await obs.exec(`SELECT role FROM public.profiles WHERE id='${MEM1}';`)).stdout;
      record('T07-T09-CONCURRENT-DELETE-SERIALIZED', 'Governanca', (blk7 && rB7.sqlstate === '42501' && memRole7 === 'member') ? 'PASS' : 'FAIL', rB7.sqlstate, `Serializado sem deadlock (${blk7}); após COMMIT de A, B falhou com ${rB7.sqlstate}; memRole=${memRole7}`);

      // 8. Tentativas simultâneas de alteração de roles (serializadas corretamente)
      await obs.exec(`
        INSERT INTO auth.users (id, email, raw_user_meta_data)
        VALUES ('${A2}', 'r915_a2@vexor.local', '{"username":"r915_a2"}')
        ON CONFLICT (id) DO NOTHING;
        UPDATE public.profiles SET role = 'admin', is_suspended = false WHERE id = '${A2}';
      `);
      await sA.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sA.exec(`SELECT set_config('request.jwt.claim.sub','${A1}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      await sA.exec(`SELECT public.admin_set_user_role('${MEM1}', 'moderator');`);
      await sB.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sB.exec(`SELECT set_config('request.jwt.claim.sub','${A2}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      const pB8 = sB.exec(`SELECT public.admin_set_user_role('${MEM1}', 'member');`);
      await waitUntilBlocked(obs, sB.pid, 4000);
      await sA.exec('COMMIT;');
      const rB8 = await pB8;
      await sB.exec('COMMIT;');
      const memRole8 = (await obs.exec(`SELECT role FROM public.profiles WHERE id='${MEM1}';`)).stdout;
      record('T08-SIMULTANEOUS-ROLE-SERIALIZED', 'Governanca', (!rB8.hasError && memRole8 === 'member') ? 'PASS' : 'FAIL', rB8.sqlstate, `Serialização consistente; role final=${memRole8}`);

      // 10. Integridade de audit_logs + exclusão de conta não-último-admin com histórico em audit_logs (V5)
      const delA2 = await obs.exec(`DELETE FROM auth.users WHERE id = '${A2}';`);
      const auditCountA2 = Number((await obs.exec(`SELECT count(*) FROM public.audit_logs WHERE actor_id = '${A2}';`)).stdout);
      const updAudit = await obs.exec(`UPDATE public.audit_logs SET action = 'tamper' WHERE actor_id = '${A2}';`);
      record('T10-AUDIT-LOGS-V5', 'Governanca', (!delA2.hasError && auditCountA2 > 0 && updAudit.sqlstate === '42501') ? 'PASS' : 'FAIL', updAudit.sqlstate, `Exclusão A2 ok=${!delA2.hasError}, logs preservados=${auditCountA2}, tamper bloqueado=${updAudit.sqlstate}`);

      // 11, 12, 17, 18. Privacidade Anon (tabela base profiles + view public_profiles)
      await sA.exec('BEGIN; SET LOCAL ROLE anon;');
      const rAnonProfiles = await sA.exec(`SELECT username, is_suspended, role FROM public.profiles;`);
      await sA.safeRollback();

      await sA.exec('BEGIN; SET LOCAL ROLE anon;');
      const rAnonView = await sA.exec(`SELECT username FROM public.public_profiles ORDER BY username;`);
      await sA.safeRollback();

      await sA.exec('BEGIN; SET LOCAL ROLE anon;');
      const rAnonViewRole = await sA.exec(`SELECT role FROM public.public_profiles LIMIT 1;`);
      await sA.safeRollback();

      await sA.exec('BEGIN; SET LOCAL ROLE anon;');
      const rAnonViewSusp = await sA.exec(`SELECT is_suspended FROM public.public_profiles LIMIT 1;`);
      await sA.safeRollback();

      const anonRows = rAnonView.stdout.split('\n').filter(Boolean);
      record('T11-ANON-BASE-PROFILES-DENIED', 'Privacidade', rAnonProfiles.sqlstate === '42501' ? 'PASS' : 'FAIL', rAnonProfiles.sqlstate, `Anon bloqueado na tabela base: ${rAnonProfiles.stderr.split('\n')[0]}`);
      record('T12-T17-T18-ANON-VIEW-PRIVACY', 'Privacidade', (!rAnonView.hasError && !anonRows.includes('r915_susp') && rAnonViewRole.sqlstate === '42703' && rAnonViewSusp.sqlstate === '42703') ? 'PASS' : 'FAIL', rAnonViewRole.sqlstate, `View oculta suspenso (${anonRows.length} ativos) e não expõe role/is_suspended (42703)`);

      // 13 & 14. Usuário autenticado comum (member) vê apenas o próprio registro em profiles e atualiza sua bio
      await sA.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sA.exec(`SELECT set_config('request.jwt.claim.sub','${MEM1}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      const rMemProfiles = await sA.exec(`SELECT id FROM public.profiles;`);
      const rMemUpd = await sA.exec(`UPDATE public.profiles SET bio = 'updated own bio' WHERE id = '${MEM1}';`);
      await sA.exec('COMMIT;');
      const memIds = rMemProfiles.stdout.split('\n').filter(Boolean);
      record('T13-T14-MEMBER-OWN-PROFILE', 'Privacidade', (memIds.length === 1 && memIds[0] === MEM1 && !rMemUpd.hasError) ? 'PASS' : 'FAIL', rMemUpd.sqlstate, `Member vê apenas próprio perfil (count=${memIds.length}) e atualiza bio`);

      // 15. Acesso de moderador
      await sA.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sA.exec(`SELECT set_config('request.jwt.claim.sub','${MOD1}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      const rModView = await sA.exec(`SELECT username FROM public.public_profiles WHERE username = 'r915_susp';`);
      const rModBase = await sA.exec(`SELECT count(*) FROM public.profiles;`);
      await sA.safeRollback();
      record('T15-MODERATOR-ACCESS', 'Privacidade', (rModView.stdout.trim() === 'r915_susp' && Number(rModBase.stdout) >= 4) ? 'PASS' : 'FAIL', null, `Moderador vê suspenso na view e ${rModBase.stdout} perfis na base`);

      // 16. Acesso de administrador
      await sA.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sA.exec(`SELECT set_config('request.jwt.claim.sub','${A1}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      const rAdmLogs = await sA.exec(`SELECT count(*) FROM public.audit_logs;`);
      const rAdmBase = await sA.exec(`SELECT count(*) FROM public.profiles;`);
      await sA.safeRollback();
      record('T16-ADMIN-ACCESS', 'Privacidade', (!rAdmLogs.hasError && Number(rAdmLogs.stdout) > 0 && Number(rAdmBase.stdout) >= 4) ? 'PASS' : 'FAIL', rAdmLogs.sqlstate, `Admin lê audit_logs (${rAdmLogs.stdout}) e profiles (${rAdmBase.stdout})`);

      // 19, 20, 21. Tentativas de chamar RPC administrativa como anon, member e moderator
      await sA.exec('BEGIN; SET LOCAL ROLE anon;');
      const r19 = await sA.exec(`SELECT public.admin_set_user_role('${MEM1}', 'admin');`);
      await sA.safeRollback();
      await sA.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sA.exec(`SELECT set_config('request.jwt.claim.sub','${MEM1}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      const r20 = await sA.exec(`SELECT public.admin_set_user_role('${MEM1}', 'admin');`);
      await sA.safeRollback();
      await sA.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sA.exec(`SELECT set_config('request.jwt.claim.sub','${MOD1}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      const r21 = await sA.exec(`SELECT public.admin_set_user_role('${MEM1}', 'admin');`);
      await sA.safeRollback();
      record('T19-ANON-RPC-DENIED', 'Autorizacao', r19.sqlstate === '42501' ? 'PASS' : 'FAIL', r19.sqlstate, 'Anon bloqueado em RPC admin');
      record('T20-MEMBER-RPC-DENIED', 'Autorizacao', r20.sqlstate === '42501' ? 'PASS' : 'FAIL', r20.sqlstate, 'Member bloqueado em RPC admin');
      record('T21-MOD-RPC-DENIED', 'Autorizacao', r21.sqlstate === '42501' ? 'PASS' : 'FAIL', r21.sqlstate, 'Moderator bloqueado em RPC admin');

      // 23 & 24. Moderador rebaixado durante operação (moderate_topic) + rollback sem alteração parcial (V4)
      const prepMod = await obs.exec(`
        INSERT INTO public.categories (id, slug, name_en, name_pt) VALUES ('${CAT1}', 'cat-r915', 'Cat R915', 'Cat R915') ON CONFLICT (id) DO NOTHING;
        INSERT INTO public.topics (id, category_id, author_id, title, body) VALUES ('${TOPIC1}', '${CAT1}', '${MEM1}', 'Topic R915 Test', 'Body for concurrent moderation test') ON CONFLICT (id) DO NOTHING;
      `);
      if (prepMod.hasError) throw new Error('Setup T23 failed: ' + prepMod.stderr);
      await sA.exec('BEGIN;');
      await sA.exec(`UPDATE public.topics SET is_pinned = false WHERE id = '${TOPIC1}';`); // segura lock na linha do tópico

      await sB.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sB.exec(`SELECT set_config('request.jwt.claim.sub','${MOD1}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      const pMod = sB.exec(`SELECT public.moderate_topic('${TOPIC1}', 'lock', 'concurrent test');`);
      const blkMod = await waitUntilBlocked(obs, sB.pid, 4000);

      // Sessão C (Admin A1) rebaixa MOD1 para member e commita enquanto B aguarda lock do tópico!
      await sC.exec('BEGIN; SET LOCAL ROLE authenticated;');
      await sC.exec(`SELECT set_config('request.jwt.claim.sub','${A1}',true), set_config('request.jwt.claim.role','authenticated',true);`);
      await sC.exec(`SELECT public.admin_set_user_role('${MOD1}', 'member');`);
      await sC.exec('COMMIT;');

      await sA.exec('COMMIT;');
      const rMod = await pMod;
      await sB.safeRollback();
      const topicLocked = (await obs.exec(`SELECT is_locked FROM public.topics WHERE id='${TOPIC1}';`)).stdout;
      record('T23-T24-MOD-DEMOTED-DURING-OP', 'Autorizacao', (blkMod && rMod.sqlstate === '42501' && topicLocked === 'f') ? 'PASS' : 'FAIL', rMod.sqlstate, `Moderador rebaixado durante lock bloqueado na revalidação (42501); is_locked=${topicLocked}`);
    } finally {
      if (baseAdmins.length > 0) {
        await obs.exec(`UPDATE public.profiles SET role = 'admin' WHERE id IN (${baseAdmins.map(x => `'${x}'`).join(',')});`);
      }
      await obs.exec(`DELETE FROM public.topics WHERE id = '${TOPIC1}'; DELETE FROM public.categories WHERE id = '${CAT1}';`);
      await obs.exec(`DELETE FROM auth.users WHERE id IN ('${A1}','${A2}','${MOD1}','${MEM1}','${SUSP1}');`);
    }
  } finally {
    await sA.safeRollback();
    await sB.safeRollback();
    await sC.safeRollback();
    await obs.close();
    await sA.close();
    await sB.close();
    await sC.close();
    await stopLocalPostgresIfStarted(startedByUs);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
