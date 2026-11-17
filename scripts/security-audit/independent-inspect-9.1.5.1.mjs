/**
 * VEXOR — ETAPA 9.1.5.1: INSPEÇÃO SOMENTE LEITURA PARA AUDITORIA INDEPENDENTE
 * Não altera nenhum objeto ou dado. Apenas SELECTs e ROLLBACK.
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

async function main() {
  const { startedByUs } = await ensureLocalPostgresRunning();
  const identity = await verifyServerIdentity();

  const obs = new InteractivePsqlSession('AUDIT_OBS');
  const ro = new InteractivePsqlSession('AUDIT_RO');

  try {
    await obs.connect();
    await ro.connect();

    const procs = (await obs.exec(`
      SELECT p.proname || '|' || pg_get_userbyid(p.proowner) || '|' || p.prosecdef || '|' || coalesce(p.proconfig::text,'{}')
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prosecdef = true
      ORDER BY p.proname;
    `)).stdout.split('\n').filter(Boolean);

    const viewMeta = (await obs.exec(`
      SELECT c.relname || '|' || pg_get_userbyid(c.relowner) || '|' || coalesce(c.reloptions::text,'{}')
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'public_profiles';
    `)).stdout;

    const viewCols = (await obs.exec(`
      SELECT column_name || '|' || data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'public_profiles'
      ORDER BY ordinal_position;
    `)).stdout.split('\n').filter(Boolean);

    const profilesPolicies = (await obs.exec(`
      SELECT policyname || '|' || permissive || '|' || roles::text || '|' || cmd || '|' || coalesce(qual,'')
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles'
      ORDER BY policyname;
    `)).stdout.split('\n').filter(Boolean);

    const profilesGrants = (await obs.exec(`
      SELECT grantee || '|' || privilege_type
      FROM information_schema.table_privileges
      WHERE table_schema = 'public' AND table_name IN ('profiles','public_profiles')
      ORDER BY table_name, grantee, privilege_type;
    `)).stdout.split('\n').filter(Boolean);

    const auditConstraints = (await obs.exec(`
      SELECT conname || '|' || pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'public.audit_logs'::regclass
      ORDER BY conname;
    `)).stdout.split('\n').filter(Boolean);

    const auditTriggers = (await obs.exec(`
      SELECT trigger_name || '|' || action_timing || '|' || event_manipulation
      FROM information_schema.triggers
      WHERE event_object_schema = 'public' AND event_object_table = 'audit_logs'
      ORDER BY trigger_name;
    `)).stdout.split('\n').filter(Boolean);

    const orphanAuditActors = (await obs.exec(`
      SELECT count(*)
      FROM public.audit_logs a
      LEFT JOIN public.profiles p ON p.id = a.actor_id
      WHERE a.actor_id IS NOT NULL AND p.id IS NULL;
    `)).stdout;

    // Testes somente leitura com SET LOCAL ROLE + ROLLBACK
    await ro.exec('BEGIN; SET LOCAL ROLE anon;');
    const anonProfiles = await ro.exec(`SELECT count(*) FROM public.profiles;`);
    await ro.safeRollback();

    await ro.exec('BEGIN; SET LOCAL ROLE anon;');
    const anonView = await ro.exec(`SELECT count(*) FROM public.public_profiles;`);
    await ro.safeRollback();

    await ro.exec('BEGIN; SET LOCAL ROLE anon;');
    const anonViewCols = await ro.exec(`SELECT role, is_suspended FROM public.public_profiles LIMIT 1;`);
    await ro.safeRollback();

    const memberId = (await obs.exec(`SELECT id FROM public.profiles WHERE role = 'member' AND NOT is_suspended LIMIT 1;`)).stdout;
    await ro.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await ro.exec(`SELECT set_config('request.jwt.claim.sub','${memberId}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    const memberOwn = await ro.exec(`SELECT count(*) FROM public.profiles;`);
    const memberView = await ro.exec(`SELECT count(*) FROM public.public_profiles;`);
    await ro.safeRollback();

    const modId = (await obs.exec(`SELECT id FROM public.profiles WHERE role = 'moderator' AND NOT is_suspended LIMIT 1;`)).stdout;
    await ro.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await ro.exec(`SELECT set_config('request.jwt.claim.sub','${modId}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    const modProfiles = await ro.exec(`SELECT count(*) FROM public.profiles;`);
    const modView = await ro.exec(`SELECT count(*) FROM public.public_profiles;`);
    await ro.safeRollback();

    const adminId = (await obs.exec(`SELECT id FROM public.profiles WHERE role = 'admin' AND NOT is_suspended LIMIT 1;`)).stdout;
    await ro.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await ro.exec(`SELECT set_config('request.jwt.claim.sub','${adminId}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    const adminLogs = await ro.exec(`SELECT count(*) FROM public.audit_logs;`);
    await ro.safeRollback();

    const out = {
      identity,
      security_definer_procs: procs,
      view_meta: viewMeta,
      view_columns: viewCols,
      profiles_policies: profilesPolicies,
      table_grants: profilesGrants,
      audit_logs_constraints: auditConstraints,
      audit_logs_triggers: auditTriggers,
      orphan_audit_actors_count: Number(orphanAuditActors),
      readonly_role_checks: {
        anon_profiles_sqlstate: anonProfiles.sqlstate,
        anon_view_count: Number(anonView.stdout),
        anon_view_internal_cols_sqlstate: anonViewCols.sqlstate,
        member_profiles_count: Number(memberOwn.stdout),
        member_view_count: Number(memberView.stdout),
        moderator_profiles_count: Number(modProfiles.stdout),
        moderator_view_count: Number(modView.stdout),
        admin_audit_logs_count: Number(adminLogs.stdout)
      }
    };

    fs.writeFileSync(path.join(projectRoot, 'scripts/security-audit/result-9.1.5.1-independent-audit.json'), JSON.stringify(out, null, 2));
    console.log(JSON.stringify(out, null, 2));
  } finally {
    await ro.safeRollback();
    await obs.close();
    await ro.close();
    await stopLocalPostgresIfStarted(startedByUs);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
