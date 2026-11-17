/**
 * VEXOR — ETAPA 9.1.3.7: TESTE F-NEG-02 (SET ROLE authenticated) E REVALIDAÇÃO DE PRIVACIDADE
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  ensureLocalPostgresRunning,
  stopLocalPostgresIfStarted,
  verifyServerIdentity,
  InteractivePsqlSession,
  projectRoot
} from './pg-session-helper.mjs';

const MEMBER_ID = '91370005-0000-0000-0000-000000000001';
const TARGET_ID = '91370005-0000-0000-0000-000000000002';

async function main() {
  const { startedByUs } = await ensureLocalPostgresRunning();
  const identity = await verifyServerIdentity();

  const obs = new InteractivePsqlSession('OBS');
  const sess1 = new InteractivePsqlSession('AUTH_MEMBER');
  const sess2 = new InteractivePsqlSession('NEG_CTRL');

  try {
    await obs.connect();
    await sess1.connect();
    await sess2.connect();

    await obs.exec(`DELETE FROM auth.users WHERE id IN ('${MEMBER_ID}','${TARGET_ID}');`);
    await obs.exec(`
      INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
        ('${MEMBER_ID}', 'fneg_member@vexor.local', '{"username":"fneg_member"}'),
        ('${TARGET_ID}', 'fneg_target@vexor.local', '{"username":"fneg_target"}');
    `);

    // -------------------------------------------------------------------------
    // F-NEG-02 Sessão 1: SET ROLE authenticated + JWT de usuário member válido
    // -------------------------------------------------------------------------
    await sess1.exec('BEGIN;');
    await sess1.exec('SET LOCAL ROLE authenticated;');
    await sess1.exec(`SELECT set_config('request.jwt.claim.sub', '${MEMBER_ID}', true), set_config('request.jwt.claim.role', 'authenticated', true);`);
    const s1Check = await sess1.exec(`SELECT current_user || '|' || session_user || '|' || coalesce(auth.uid()::text,'NULL') || '|' || auth.role() || '|' || public.is_admin()::text;`);
    const s1Rpc = await sess1.exec(`SELECT public.admin_set_user_role('${TARGET_ID}', 'admin');`);
    await sess1.exec('ROLLBACK;');

    // -------------------------------------------------------------------------
    // F-NEG-02 Sessão 2A: Controle negativo — authenticated SEM contexto JWT
    // -------------------------------------------------------------------------
    await sess2.exec('BEGIN;');
    await sess2.exec('SET LOCAL ROLE authenticated;');
    await sess2.exec(`SELECT set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claim.role', '', true);`);
    const s2NoJwtCheck = await sess2.exec(`SELECT current_user || '|' || coalesce(auth.uid()::text,'NULL') || '|' || auth.role() || '|' || public.is_admin()::text;`);
    const s2NoJwtRpc = await sess2.exec(`SELECT public.admin_set_user_role('${TARGET_ID}', 'admin');`);
    await sess2.exec('ROLLBACK;');

    // -------------------------------------------------------------------------
    // F-NEG-02 Sessão 2B: Controle negativo — anon (privilégio SQL negado antes da RPC)
    // -------------------------------------------------------------------------
    await sess2.exec('BEGIN;');
    await sess2.exec('SET LOCAL ROLE anon;');
    const s2AnonRpc = await sess2.exec(`SELECT public.admin_set_user_role('${TARGET_ID}', 'admin');`);
    await sess2.exec('ROLLBACK;');

    // -------------------------------------------------------------------------
    // Seção 6: Revalidação da View experimental public_profiles e tabela base profiles
    // -------------------------------------------------------------------------
    const viewMeta = (await obs.exec(
      `SELECT c.relname || '|' || pg_get_userbyid(c.relowner) || '|' || coalesce(c.reloptions::text,'{}') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='public_profiles';`
    )).stdout;

    const activePolicies = (await obs.exec(
      `SELECT tablename || '|' || policyname || '|' || permissive || '|' || roles::text || '|' || cmd || '|' || coalesce(qual,'') FROM pg_policies WHERE schemaname='public' AND tablename='profiles' ORDER BY policyname;`
    )).stdout.split('\n').filter(Boolean);

    const tableGrants = (await obs.exec(
      `SELECT grantee || '|' || privilege_type FROM information_schema.table_privileges WHERE table_schema='public' AND table_name IN ('profiles','public_profiles') AND grantee IN ('anon','authenticated') ORDER BY table_name, grantee, privilege_type;`
    )).stdout.split('\n').filter(Boolean);

    const colGrants = (await obs.exec(
      `SELECT table_name || '|' || grantee || '|' || column_name || '|' || privilege_type FROM information_schema.column_privileges WHERE table_schema='public' AND table_name='profiles' AND grantee IN ('anon','authenticated') AND column_name IN ('is_suspended','role') ORDER BY grantee, column_name, privilege_type;`
    )).stdout.split('\n').filter(Boolean);

    // Acesso direto de anon à tabela base public.profiles (is_suspended e role)
    await sess2.exec('BEGIN;');
    await sess2.exec('SET LOCAL ROLE anon;');
    const anonDirectProfiles = (await sess2.exec(
      `SELECT username || '|' || is_suspended::text || '|' || role::text FROM public.profiles ORDER BY username;`
    )).stdout.split('\n').filter(Boolean);
    const anonPublicProfiles = (await sess2.exec(
      `SELECT username || '|' || role::text FROM public.public_profiles ORDER BY username;`
    )).stdout.split('\n').filter(Boolean);
    const anonIsModerator = (await sess2.exec(`SELECT public.is_moderator()::text;`)).stdout;
    await sess2.exec('ROLLBACK;');

    // Comportamento de is_moderator() para moderador ativo
    const modCheck = (await obs.exec(`
      BEGIN;
      SET LOCAL ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub', id::text, true), set_config('request.jwt.claim.role', 'authenticated', true) FROM public.profiles WHERE role = 'moderator' LIMIT 1;
      SELECT public.is_moderator()::text;
      COMMIT;
    `)).stdout;

    const output = {
      identity,
      f_neg_02: {
        member_uuid: MEMBER_ID,
        target_uuid: TARGET_ID,
        session1_authenticated_member: {
          context_check: s1Check.stdout,
          rpc_result: s1Rpc
        },
        session2_negative_control_no_jwt: {
          context_check: s2NoJwtCheck.stdout,
          rpc_result: s2NoJwtRpc
        },
        session2_negative_control_anon_sql_priv: {
          rpc_result: s2AnonRpc
        }
      },
      section6_view_and_privacy_revalidation: {
        view_meta: viewMeta,
        profiles_policies: activePolicies,
        table_grants: tableGrants,
        column_grants_is_suspended_and_role: colGrants,
        anon_direct_base_profiles_rows: anonDirectProfiles,
        anon_public_profiles_view_rows: anonPublicProfiles,
        anon_is_moderator: anonIsModerator,
        moderator_is_moderator: modCheck.split('\n').pop()
      }
    };

    fs.writeFileSync(path.join(projectRoot, 'scripts/security-audit/result-f-neg-02-privacy.json'), JSON.stringify(output, null, 2));
    console.log(JSON.stringify(output, null, 2));

    await obs.exec(`DELETE FROM auth.users WHERE id IN ('${MEMBER_ID}','${TARGET_ID}');`);
  } finally {
    await obs.close();
    await sess1.close();
    await sess2.close();
    await stopLocalPostgresIfStarted(startedByUs);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
