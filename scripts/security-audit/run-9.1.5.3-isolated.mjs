/**
 * VEXOR — ETAPA 9.1.5.3: VALIDAÇÃO EM BANCO ISOLADO (vexor_audit_9153)
 * NÃO modifica vexor_audit, migrations originais ou Supabase remoto.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  ensureLocalPostgresRunning,
  stopLocalPostgresIfStarted,
  runCommand,
  PSQL_EXE,
  HOST,
  PORT,
  projectRoot
} from './pg-session-helper.mjs';

const ISO_DB = 'vexor_audit_9153';
const outPath = path.join(projectRoot, 'scripts/security-audit/etapa-9.1.5.3/TEST-EXECUTION-RESULTS.json');

class IsolatedPsqlSession {
  constructor(name, db) {
    this.name = name;
    this.db = db;
    this.proc = null;
    this.pid = null;
    this.stdoutBuf = '';
    this.stderrBuf = '';
    this.seq = 0;
    this.pending = null;
  }

  async connect() {
    this.proc = spawn(PSQL_EXE, [
      '-h', HOST, '-p', String(PORT), '-U', 'postgres', '-d', this.db,
      '-X', '-n', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=0', '-v', 'VERBOSITY=verbose'
    ], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stdout.on('data', c => { this.stdoutBuf += c.toString(); this._check(); });
    this.proc.stderr.on('data', c => { this.stderrBuf += c.toString(); });
    const pidRes = await this.exec('SELECT pg_backend_pid();');
    this.pid = Number(pidRes.stdout.trim());
    return this.pid;
  }

  _check() {
    if (!this.pending) return;
    const idx = this.stdoutBuf.indexOf(this.pending.marker);
    if (idx !== -1) {
      const out = this.stdoutBuf.slice(0, idx).trim();
      this.stdoutBuf = this.stdoutBuf.slice(idx + this.pending.marker.length).replace(/^\r?\n/, '');
      const err = this.stderrBuf.trim();
      this.stderrBuf = '';
      if (this.pending.timer) clearTimeout(this.pending.timer);
      const resolve = this.pending.resolve;
      this.pending = null;
      const m = err.match(/^(?:ERROR|ERRO):\s+([0-9A-Z]{5}):/m);
      resolve({ stdout: out, stderr: err, sqlstate: m ? m[1] : null, hasError: Boolean(m || /^(?:ERROR|ERRO):/m.test(err)) });
    }
  }

  exec(sql, timeoutMs = 15000) {
    this.seq += 1;
    const marker = `__ISO_${this.name}_${this.seq}__`;
    this.stderrBuf = '';
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending && this.pending.marker === marker) {
          this.pending = null;
          reject(new Error(`Timeout na sessão ${this.name}: ${sql.slice(0, 80)}`));
        }
      }, timeoutMs);
      this.pending = { marker, resolve, reject, timer };
      this.proc.stdin.write(`${sql}\n\\echo ${marker}\n`);
    });
  }

  async safeRollback() {
    if (this.pending?.timer) { clearTimeout(this.pending.timer); this.pending = null; }
    try { await this.exec('ROLLBACK;', 2000); } catch { /* ignore */ }
  }

  async close() {
    if (this.pending?.timer) { clearTimeout(this.pending.timer); this.pending = null; }
    try { this.proc.stdin.write('\\q\n'); this.proc.stdin.end(); } catch { /* ignore */ }
    await new Promise(r => setTimeout(r, 150));
    try { if (!this.proc.killed) this.proc.kill(); } catch { /* ignore */ }
  }
}

async function waitBlocked(obs, pid, timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await obs.exec(`SELECT pid || '|' || coalesce(wait_event_type,'') || '|' || coalesce(wait_event,'') || '|' || coalesce(pg_blocking_pids(pid)::text,'{}') FROM pg_stat_activity WHERE pid = ${pid};`);
    if (r.stdout.includes('|Lock|')) return r.stdout;
    await new Promise(r2 => setTimeout(r2, 100));
  }
  return null;
}

function runSqlFile(db, relPath) {
  return runCommand(PSQL_EXE, [
    '-h', HOST, '-p', String(PORT), '-U', 'postgres', '-d', db,
    '-X', '-v', 'ON_ERROR_STOP=1', '-f', path.join(projectRoot, relPath)
  ]);
}

async function main() {
  const { startedByUs } = await ensureLocalPostgresRunning();
  const report = { identity: null, security_barrier: {}, set_accepted_post: {}, resubmit_resource: {}, t02_t04: {}, rollback_validation: {} };

  // Clona vexor_audit -> vexor_audit_9153 (sem alterar vexor_audit)
  await runCommand(PSQL_EXE, ['-h', HOST, '-p', String(PORT), '-U', 'postgres', '-d', 'postgres', '-X', '-c', `DROP DATABASE IF EXISTS ${ISO_DB};`]);
  const cloneRes = await runCommand(PSQL_EXE, ['-h', HOST, '-p', String(PORT), '-U', 'postgres', '-d', 'postgres', '-X', '-c', `CREATE DATABASE ${ISO_DB} WITH TEMPLATE vexor_audit;`]);
  if (cloneRes.code !== 0) {
    throw new Error(`Falha ao clonar vexor_audit para ${ISO_DB}: ${cloneRes.stderr || cloneRes.stdout}`);
  }

  const obs = new IsolatedPsqlSession('OBS', ISO_DB);
  const sA = new IsolatedPsqlSession('A', ISO_DB);
  const sB = new IsolatedPsqlSession('B', ISO_DB);
  const sC = new IsolatedPsqlSession('C', ISO_DB);

  try {
    await obs.connect();
    await sA.connect();
    await sB.connect();
    await sC.connect();

    const idRes = await obs.exec("SELECT coalesce(host(inet_server_addr()),'local') || '|' || inet_server_port()::text || '|' || current_database() || '|' || version();");
    const [addr, port, db, ver] = idRes.stdout.split('|');
    if (addr !== '127.0.0.1' || port !== String(PORT) || db !== ISO_DB) {
      throw new Error(`Identidade inválida: ${idRes.stdout}`);
    }
    report.identity = { addr, port: Number(port), db, version: ver };

    // 1. Aplicar PROPOSED-SECURITY-BARRIER.sql em vexor_audit_9153
    const sbApply = await runSqlFile(ISO_DB, 'scripts/security-audit/etapa-9.1.5.2/PROPOSED-SECURITY-BARRIER.sql');
    if (sbApply.code !== 0) throw new Error(`Security barrier apply failed: ${sbApply.stderr}`);
    const viewMeta = (await obs.exec(`SELECT c.relname || '|' || pg_get_userbyid(c.relowner) || '|' || coalesce(c.reloptions::text,'{}') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='public_profiles';`)).stdout;

    await sA.exec('BEGIN; SET LOCAL ROLE anon;');
    const anonView = await sA.exec('SELECT count(*) FROM public.public_profiles;');
    await sA.safeRollback();
    await sA.exec('BEGIN; SET LOCAL ROLE anon;');
    const anonBase = await sA.exec('SELECT count(*) FROM public.profiles;');
    await sA.safeRollback();
    report.security_barrier = { view_meta: viewMeta, anon_view_count: Number(anonView.stdout), anon_base_sqlstate: anonBase.sqlstate };

    // 2. Aplicar PROPOSED-RPC-REVALIDATION.sql em vexor_audit_9153
    const rpcApply = await runSqlFile(ISO_DB, 'scripts/security-audit/etapa-9.1.5.2/PROPOSED-RPC-REVALIDATION.sql');
    if (rpcApply.code !== 0) throw new Error(`RPC revalidation apply failed: ${rpcApply.stderr}`);

    // Setup de dados de teste em vexor_audit_9153
    const U_ADM = '91530001-0000-0000-0000-000000000001';
    const U_ADM2 = '91530001-0000-0000-0000-000000000002';
    const U_MOD = '91530001-0000-0000-0000-000000000003';
    const U_MEM = '91530001-0000-0000-0000-000000000004';
    const CAT = '91530001-0000-0000-0000-000000000010';
    const TOP = '91530001-0000-0000-0000-000000000020';
    const POST1 = '91530001-0000-0000-0000-000000000030';
    const POST2 = '91530001-0000-0000-0000-000000000031';
    const RES1 = '91530001-0000-0000-0000-000000000040';

    await obs.exec(`
      INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
        ('${U_ADM}', 'iso_adm1@vexor.local', '{"username":"iso_adm1"}'),
        ('${U_ADM2}', 'iso_adm2@vexor.local', '{"username":"iso_adm2"}'),
        ('${U_MOD}', 'iso_mod@vexor.local', '{"username":"iso_mod"}'),
        ('${U_MEM}', 'iso_mem@vexor.local', '{"username":"iso_mem"}');
      UPDATE public.profiles SET role='admin' WHERE id IN ('${U_ADM}','${U_ADM2}');
      UPDATE public.profiles SET role='moderator' WHERE id='${U_MOD}';
      INSERT INTO public.categories (id, slug, name_en, name_pt) VALUES ('${CAT}', 'iso-cat', 'Iso Cat', 'Iso Cat');
      INSERT INTO public.topics (id, category_id, author_id, title, body, is_locked) VALUES ('${TOP}', '${CAT}', '${U_MEM}', 'Iso Topic Title', 'Iso Topic Body Long Enough', true);
      INSERT INTO public.posts (id, topic_id, author_id, body) VALUES
        ('${POST1}', '${TOP}', '${U_MEM}', 'First reply body long enough'),
        ('${POST2}', '${TOP}', '${U_MEM}', 'Second reply body long enough');
      INSERT INTO public.resources (id, slug, name, description, category_id, type, url, submitted_by, status, rejection_reason)
      VALUES ('${RES1}', 'iso-res', 'Iso Resource', 'Iso Resource Description Long Enough', '${CAT}', 'tool', 'https://example.com/iso-res', '${U_MEM}', 'rejected', 'needs detail');
    `);

    // 3. set_accepted_post Cenário A (moderator rebaixado enquanto aguarda lock de topics)
    await sA.exec('BEGIN;');
    await sA.exec(`UPDATE public.topics SET is_pinned = false WHERE id = '${TOP}';`);
    await sB.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await sB.exec(`SELECT set_config('request.jwt.claim.sub','${U_MOD}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    const pModSet = sB.exec(`SELECT public.set_accepted_post('${TOP}', '${POST1}');`);
    const blkModSet = await waitBlocked(obs, sB.pid, 4000);

    await sC.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await sC.exec(`SELECT set_config('request.jwt.claim.sub','${U_ADM}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    await sC.exec(`SELECT public.admin_set_user_role('${U_MOD}', 'member');`);
    await sC.exec('COMMIT;');

    await sA.exec('COMMIT;');
    const rModSet = await pModSet;
    await sB.safeRollback();
    const accAfterA = (await obs.exec(`SELECT coalesce(accepted_post_id::text,'NULL') FROM public.topics WHERE id='${TOP}';`)).stdout;
    report.set_accepted_post.scenario_A_demoted_mod = { blocked: blkModSet, sqlstate: rModSet.sqlstate, accepted_post_id: accAfterA };

    // set_accepted_post Cenário C (moderador excluído concorrentemente -> FOR SHARE NOWAIT retorna 55P03)
    await obs.exec(`UPDATE public.profiles SET role='moderator' WHERE id='${U_MOD}';`);
    await sA.exec('BEGIN;');
    await sA.exec(`DELETE FROM auth.users WHERE id='${U_MOD}';`);
    await sB.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await sB.exec(`SELECT set_config('request.jwt.claim.sub','${U_MOD}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    const rModDel = await sB.exec(`SELECT public.set_accepted_post('${TOP}', '${POST1}');`);
    await sB.safeRollback();
    await sA.exec('ROLLBACK;');
    report.set_accepted_post.scenario_C_deleted_mod = { sqlstate: rModDel.sqlstate, hasError: rModDel.hasError };

    // set_accepted_post Cenário D (duas sessões alteram simultaneamente -> serialização em topics)
    await sA.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await sA.exec(`SELECT set_config('request.jwt.claim.sub','${U_MOD}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    await sA.exec(`SELECT public.set_accepted_post('${TOP}', '${POST1}');`);
    await sB.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await sB.exec(`SELECT set_config('request.jwt.claim.sub','${U_MOD}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    const pD = sB.exec(`SELECT public.set_accepted_post('${TOP}', '${POST2}');`);
    const blkD = await waitBlocked(obs, sB.pid, 4000);
    await sA.exec('COMMIT;');
    const rD = await pD;
    await sB.exec('COMMIT;');
    const accAfterD = (await obs.exec(`SELECT accepted_post_id FROM public.topics WHERE id='${TOP}';`)).stdout;
    report.set_accepted_post.scenario_D_concurrent_set = { blocked: blkD, hasError: rD.hasError, final_accepted_post_id: accAfterD };

    // 4. resubmit_resource (dono suspenso durante lock wait -> 42501; dono ativo -> sucesso)
    await sA.exec('BEGIN;');
    const rLockRes = await sA.exec(`UPDATE public.resources SET name = name WHERE id='${RES1}';`);
    if (rLockRes.hasError) throw new Error(`Falha ao travar resource em sA: ${rLockRes.stderr}`);
    await sB.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await sB.exec(`SELECT set_config('request.jwt.claim.sub','${U_MEM}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    const pResub = sB.exec(`SELECT public.resubmit_resource('${RES1}');`);
    const blkResub = await waitBlocked(obs, sB.pid, 4000);
    await sC.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await sC.exec(`SELECT set_config('request.jwt.claim.sub','${U_ADM}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    await sC.exec(`SELECT public.admin_set_user_suspension('${U_MEM}', true, 'concurrent susp');`);
    await sC.exec('COMMIT;');
    await sA.exec('COMMIT;');
    const rResubSusp = await pResub;
    await sB.safeRollback();
    const resStatusAfterSusp = (await obs.exec(`SELECT status FROM public.resources WHERE id='${RES1}';`)).stdout;

    await obs.exec(`UPDATE public.profiles SET is_suspended=false WHERE id='${U_MEM}';`);
    await sB.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await sB.exec(`SELECT set_config('request.jwt.claim.sub','${U_MEM}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    const rResubOk = await sB.exec(`SELECT public.resubmit_resource('${RES1}');`);
    await sB.exec('COMMIT;');
    const resStatusAfterOk = (await obs.exec(`SELECT status FROM public.resources WHERE id='${RES1}';`)).stdout;
    report.resubmit_resource = {
      concurrent_suspension: { blocked: blkResub, sqlstate: rResubSusp.sqlstate, status: resStatusAfterSusp },
      active_owner_resubmit: { hasError: rResubOk.hasError, status: resStatusAfterOk }
    };

    // 5. Testes T02-R1, T02-R2, T04-R1, T04-R2 (isolando admins apenas a U_ADM e U_ADM2)
    await obs.exec(`UPDATE public.profiles SET role='member' WHERE role='admin' AND id NOT IN ('${U_ADM}','${U_ADM2}');`);

    // T02-R1: rebaixamento mútuo concorrente
    await sA.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await sA.exec(`SELECT set_config('request.jwt.claim.sub','${U_ADM}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    await sA.exec(`SELECT public.admin_set_user_role('${U_ADM2}', 'member');`);
    await sB.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await sB.exec(`SELECT set_config('request.jwt.claim.sub','${U_ADM2}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    const pT02R1 = sB.exec(`SELECT public.admin_set_user_role('${U_ADM}', 'member');`);
    const blkT02R1 = await waitBlocked(obs, sB.pid, 4000);
    await sA.exec('COMMIT;');
    const rT02R1 = await pT02R1;
    await sB.safeRollback();
    const adminsAfterT02R1 = Number((await obs.exec(`SELECT count(*) FROM public.profiles WHERE role='admin' AND NOT is_suspended;`)).stdout);
    report.t02_t04.T02_R1 = { blocked: blkT02R1, sqlstate_B: rT02R1.sqlstate, admins_remaining: adminsAfterT02R1 };

    // T02-R2: alcance direto de v_other_admin = 0 no trigger BEFORE DELETE
    const rDelAuth = await obs.exec(`DELETE FROM auth.users WHERE id='${U_ADM}';`);
    const rDelProf = await obs.exec(`DELETE FROM public.profiles WHERE id='${U_ADM}';`);
    const adm1Exists = Number((await obs.exec(`SELECT count(*) FROM public.profiles WHERE id='${U_ADM}';`)).stdout);
    report.t02_t04.T02_R2_reaches_v_other_admin_0 = {
      auth_users_delete_sqlstate: rDelAuth.sqlstate,
      auth_users_delete_msg: rDelAuth.stderr.split('\n')[0],
      profiles_delete_sqlstate: rDelProf.sqlstate,
      admin_preserved: adm1Exists === 1
    };

    // T04-R1: suspensão mútua concorrente
    await obs.exec(`UPDATE public.profiles SET role='admin', is_suspended=false WHERE id='${U_ADM2}';`);
    await sA.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await sA.exec(`SELECT set_config('request.jwt.claim.sub','${U_ADM}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    await sA.exec(`SELECT public.admin_set_user_suspension('${U_ADM2}', true, 'mutual test');`);
    await sB.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await sB.exec(`SELECT set_config('request.jwt.claim.sub','${U_ADM2}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    const pT04R1 = sB.exec(`SELECT public.admin_set_user_suspension('${U_ADM}', true, 'mutual test');`);
    const blkT04R1 = await waitBlocked(obs, sB.pid, 4000);
    await sA.exec('COMMIT;');
    const rT04R1 = await pT04R1;
    await sB.safeRollback();
    const adminsAfterT04R1 = Number((await obs.exec(`SELECT count(*) FROM public.profiles WHERE role='admin' AND NOT is_suspended;`)).stdout);
    report.t02_t04.T04_R1 = { blocked: blkT04R1, sqlstate_B: rT04R1.sqlstate, admins_remaining: adminsAfterT04R1 };

    // T04-R2: auto-suspensão do último admin ativo (chega na guarda de auto-suspensão, não v_other_admin = 0)
    await sA.exec('BEGIN; SET LOCAL ROLE authenticated;');
    await sA.exec(`SELECT set_config('request.jwt.claim.sub','${U_ADM}',true), set_config('request.jwt.claim.role','authenticated',true);`);
    const rT04R2 = await sA.exec(`SELECT public.admin_set_user_suspension('${U_ADM}', true, 'self test');`);
    await sA.safeRollback();
    report.t02_t04.T04_R2_self_guard = { sqlstate: rT04R2.sqlstate, message: rT04R2.stderr.split('\n')[0] };

    // 6. Testar PROPOSED-ROLLBACK-COMPLETE.sql somente em vexor_audit_9153
    const rbRes = await runSqlFile(ISO_DB, 'scripts/security-audit/etapa-9.1.5.2/PROPOSED-ROLLBACK-COMPLETE.sql');
    const rbTrigCount = Number((await obs.exec(`SELECT count(*) FROM pg_trigger WHERE tgname='profiles_protect_last_admin_delete';`)).stdout);
    const rbViewCount = Number((await obs.exec(`SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='public_profiles';`)).stdout);
    const rbFk = (await obs.exec(`SELECT conname || '|validated=' || convalidated FROM pg_constraint WHERE conrelid='public.audit_logs'::regclass AND conname='audit_logs_actor_id_fkey';`)).stdout;
    const rbHasAdvLock = Number((await obs.exec(`SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('admin_set_user_role','admin_set_user_suspension','moderate_resource','moderate_topic','moderate_post','resolve_report') AND pg_get_functiondef(p.oid) LIKE '%pg_advisory_xact_lock%';`)).stdout);

    report.rollback_validation = {
      exit_code: rbRes.code,
      stderr: rbRes.stderr,
      trigger_remaining: rbTrigCount,
      view_remaining: rbViewCount,
      fk_restored: rbFk,
      rpcs_still_with_advisory_lock: rbHasAdvLock
    };

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await sA.safeRollback();
    await sB.safeRollback();
    await sC.safeRollback();
    await obs.close();
    await sA.close();
    await sB.close();
    await sC.close();
    // Limpa o banco isolado temporário mantendo vexor_audit intacto
    await runCommand(PSQL_EXE, ['-h', HOST, '-p', String(PORT), '-U', 'postgres', '-d', 'postgres', '-X', '-c', `DROP DATABASE IF EXISTS ${ISO_DB};`]);
    await stopLocalPostgresIfStarted(startedByUs);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
