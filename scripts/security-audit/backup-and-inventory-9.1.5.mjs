/**
 * VEXOR — ETAPA 9.1.5: BACKUP LÓGICO E INVENTÁRIO PRÉ-IMPLEMENTAÇÃO
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  ensureLocalPostgresRunning,
  stopLocalPostgresIfStarted,
  verifyServerIdentity,
  runCommand,
  InteractivePsqlSession,
  BIN_DIR,
  HOST,
  PORT,
  DB_NAME,
  projectRoot
} from './pg-session-helper.mjs';

const PG_DUMP_EXE = path.join(BIN_DIR, 'pg_dump.exe');

async function main() {
  const { startedByUs } = await ensureLocalPostgresRunning();
  const identity = await verifyServerIdentity();

  const backupPath = path.join(projectRoot, 'scripts/security-audit/backup-vexor_audit-pre-9.1.5.sql');
  const dumpRes = await runCommand(PG_DUMP_EXE, [
    '-h', HOST,
    '-p', String(PORT),
    '-U', 'postgres',
    '-d', DB_NAME,
    '-f', backupPath
  ]);
  if (dumpRes.code !== 0) {
    throw new Error(`Falha no pg_dump: ${dumpRes.stderr || dumpRes.stdout}`);
  }

  const obs = new InteractivePsqlSession('INV');
  try {
    await obs.connect();
    const fkAudit = (await obs.exec(
      `SELECT conname || '|' || pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.audit_logs'::regclass;`
    )).stdout.split('\n').filter(Boolean);
    const triggers = (await obs.exec(
      `SELECT event_object_schema || '.' || event_object_table || '|' || trigger_name || '|' || action_timing || '|' || event_manipulation FROM information_schema.triggers ORDER BY 1,2;`
    )).stdout.split('\n').filter(Boolean);
    const policies = (await obs.exec(
      `SELECT tablename || '|' || policyname || '|' || roles::text || '|' || cmd || '|' || coalesce(qual,'') FROM pg_policies WHERE schemaname='public' ORDER BY 1,2;`
    )).stdout.split('\n').filter(Boolean);
    const viewInfo = (await obs.exec(
      `SELECT c.relname || '|' || pg_get_userbyid(c.relowner) || '|' || coalesce(c.reloptions::text,'{}') || '|' || pg_get_viewdef(c.oid, true) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='public_profiles';`
    )).stdout;

    const inv = {
      identity,
      backup_file: 'scripts/security-audit/backup-vexor_audit-pre-9.1.5.sql',
      backup_bytes: fs.statSync(backupPath).size,
      audit_logs_constraints: fkAudit,
      triggers,
      policies,
      public_profiles_view: viewInfo
    };
    fs.writeFileSync(path.join(projectRoot, 'scripts/security-audit/inventory-pre-9.1.5.json'), JSON.stringify(inv, null, 2));
    console.log(JSON.stringify({ identity, backup_bytes: inv.backup_bytes, fkAudit }, null, 2));
  } finally {
    await obs.close();
    await stopLocalPostgresIfStarted(startedByUs);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
