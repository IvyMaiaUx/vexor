/**
 * VEXOR — ETAPA 9.1.3.6: INSPEÇÃO FORENSE DO BANCO LOCAL vexor_audit
 * Apenas leitura de catálogo e testes de verificação sem apagar o banco existente.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const BIN_DIR = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const POSTGRES_EXE = path.join(BIN_DIR, 'postgres.exe');
const PSQL_EXE = path.join(BIN_DIR, 'psql.exe');
const PG_ISREADY_EXE = path.join(BIN_DIR, 'pg_isready.exe');
const PG_CTL_EXE = path.join(BIN_DIR, 'pg_ctl.exe');
const CLUSTER_DIR = path.join(projectRoot, '.pg_test_cluster');
const PORT = 5433;
const DB_NAME = 'vexor_audit';

function waitForPostgresReady(port, timeoutMs = 25000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      const proc = spawn(PG_ISREADY_EXE, ['-h', '127.0.0.1', '-p', String(port)], { windowsHide: true });
      proc.on('close', code => {
        if (code === 0) resolve(true);
        else if (Date.now() - start > timeoutMs) reject(new Error('Timeout waiting for pg_isready'));
        else setTimeout(check, 500);
      });
      proc.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error('Error invoking pg_isready'));
        else setTimeout(check, 500);
      });
    }
    check();
  });
}

function runPsql(sqlCommand, db = DB_NAME) {
  return new Promise((resolve, reject) => {
    const args = ['-h', '127.0.0.1', '-p', String(PORT), '-U', 'postgres', '-d', db, '-X', '-c', sqlCommand];
    const proc = spawn(PSQL_EXE, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('close', code => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }));
    proc.on('error', reject);
  });
}

async function main() {
  const pidFile = path.join(CLUSTER_DIR, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    try { fs.unlinkSync(pidFile); } catch { /* ignore */ }
  }

  const pgProc = spawn(POSTGRES_EXE, ['-D', CLUSTER_DIR, '-p', String(PORT)], {
    stdio: 'ignore',
    detached: false
  });

  try {
    await waitForPostgresReady(PORT, 25000);

    const queries = [
      {
        title: '1. AMBIENTE E VERSAO',
        sql: `SELECT version(), current_database(), inet_server_addr(), inet_server_port();`
      },
      {
        title: '2. FUNCOES E CONFIGURACOES (prosecdef, proowner, proconfig)',
        sql: `
          SELECT
            p.proname,
            pg_get_userbyid(p.proowner) AS owner,
            p.prosecdef AS is_security_definer,
            p.provolatile,
            p.proconfig
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname IN (
              'admin_set_user_role', 'admin_set_user_suspension',
              'is_admin', 'is_moderator', 'is_active_member',
              'current_user_role', 'write_audit_log', 'audit_logs_block_mutation'
            )
          ORDER BY p.proname;
        `
      },
      {
        title: '3. DEFINICAO EXATA DE admin_set_user_role E admin_set_user_suspension',
        sql: `
          SELECT pg_get_functiondef('public.admin_set_user_role(uuid, public.user_role)'::regprocedure);
          SELECT pg_get_functiondef('public.admin_set_user_suspension(uuid, boolean, text)'::regprocedure);
        `
      },
      {
        title: '4. TRIGGERS EM profiles, auth.users E audit_logs',
        sql: `
          SELECT
            n.nspname AS schema_name,
            c.relname AS table_name,
            t.tgname AS trigger_name,
            pg_get_triggerdef(t.oid) AS trigger_def
          FROM pg_trigger t
          JOIN pg_class c ON c.oid = t.tgrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE NOT t.tgisinternal
            AND ((n.nspname = 'public' AND c.relname IN ('profiles', 'audit_logs'))
              OR (n.nspname = 'auth' AND c.relname = 'users'))
          ORDER BY n.nspname, c.relname, t.tgname;
        `
      },
      {
        title: '5. VIEW public.public_profiles (reloptions, owner, def)',
        sql: `
          SELECT
            n.nspname,
            c.relname,
            pg_get_userbyid(c.relowner) AS owner,
            c.reloptions,
            pg_get_viewdef(c.oid, true) AS view_def
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname = 'public_profiles';
        `
      },
      {
        title: '6. POLICIES RLS EM profiles E audit_logs',
        sql: `
          SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
          FROM pg_policies
          WHERE schemaname = 'public' AND tablename IN ('profiles', 'audit_logs')
          ORDER BY tablename, policyname;
        `
      },
      {
        title: '7. GRANTS EM profiles, public_profiles E audit_logs',
        sql: `
          SELECT grantee, table_name, privilege_type
          FROM information_schema.table_privileges
          WHERE table_schema = 'public'
            AND table_name IN ('profiles', 'public_profiles', 'audit_logs')
            AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'postgres')
          ORDER BY table_name, grantee, privilege_type;
        `
      },
      {
        title: '8. GRANTS EM FUNCOES (ROUTINE PRIVILEGES)',
        sql: `
          SELECT routine_name, grantee, privilege_type
          FROM information_schema.routine_privileges
          WHERE routine_schema = 'public'
            AND routine_name IN ('admin_set_user_role', 'admin_set_user_suspension', 'is_admin', 'is_moderator', 'write_audit_log')
            AND grantee IN ('PUBLIC', 'anon', 'authenticated')
          ORDER BY routine_name, grantee;
        `
      },
      {
        title: '9. TESTE REAL DE ACESSO A public_profiles POR ANON, MEMBER, MODERATOR, ADMIN',
        sql: `
          BEGIN;
          SET LOCAL ROLE anon;
          SELECT 'anon_public_profiles' AS ctx, count(*), string_agg(username, ',' ORDER BY username) AS users FROM public.public_profiles;
          SELECT 'anon_base_profiles' AS ctx, count(*), string_agg(username || ':' || is_suspended::text, ',' ORDER BY username) AS users FROM public.profiles;
          ROLLBACK;

          BEGIN;
          SET LOCAL ROLE authenticated;
          SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000003';
          SELECT 'member_public_profiles' AS ctx, count(*), string_agg(username, ',' ORDER BY username) AS users FROM public.public_profiles;
          ROLLBACK;

          BEGIN;
          SET LOCAL ROLE authenticated;
          SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000005';
          SELECT 'mod_public_profiles' AS ctx, count(*), string_agg(username, ',' ORDER BY username) AS users FROM public.public_profiles;
          ROLLBACK;

          BEGIN;
          SET LOCAL ROLE authenticated;
          SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
          SELECT 'admin_public_profiles' AS ctx, count(*), string_agg(username, ',' ORDER BY username) AS users FROM public.public_profiles;
          ROLLBACK;
        `
      }
    ];

    const outChunks = [];
    for (const q of queries) {
      const res = await runPsql(q.sql);
      outChunks.push(`=== ${q.title} ===\nEXIT=${res.code}\nSTDOUT:\n${res.stdout}\nSTDERR:\n${res.stderr}\n`);
    }

    const outPath = path.join(projectRoot, 'scripts/security-audit/forensic-evidence.txt');
    fs.writeFileSync(outPath, outChunks.join('\n'), 'utf8');
    console.log('Evidências salvas em:', outPath);
  } finally {
    const stopProc = spawn(PG_CTL_EXE, ['stop', '-D', CLUSTER_DIR, '-m', 'fast'], { windowsHide: true });
    await new Promise(r => stopProc.on('close', r));
    pgProc.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
