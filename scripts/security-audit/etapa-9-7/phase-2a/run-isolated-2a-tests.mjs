/**
 * VEXOR — Etapa 9.7 (Fase 2A) — Testes Locais Isolados em PostgreSQL 18
 *
 * Alvo exclusivo: 127.0.0.1:5433 / banco temporário vexor_audit_97_2a (.pg_test_cluster).
 * NÃO toca em vexor_audit, NÃO toca em supabase/migrations/, NÃO acessa Supabase remoto.
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
  projectRoot,
} from '../../pg-session-helper.mjs';

const ISO_DB = 'vexor_audit_97_2a';
const RESULTS_PATH = path.join(
  projectRoot,
  'scripts/security-audit/etapa-9-7/phase-2a/test-results.json'
);

const UID = {
  admin: '00000000-0000-0000-0000-000000000901',
  mod: '00000000-0000-0000-0000-000000000902',
  author: '00000000-0000-0000-0000-000000000903',
  member: '00000000-0000-0000-0000-000000000904',
  recipient: '00000000-0000-0000-0000-000000000905',
  suspended: '00000000-0000-0000-0000-000000000906',
  orphan: '00000000-0000-0000-0000-000000000999',
};

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
    this.proc = spawn(
      PSQL_EXE,
      [
        '-h', HOST, '-p', String(PORT), '-U', 'postgres', '-d', this.db,
        '-X', '-n', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=0', '-v', 'VERBOSITY=verbose',
      ],
      {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PGCLIENTENCODING: 'UTF8' },
      }
    );
    this.proc.stdout.on('data', (c) => {
      this.stdoutBuf += c.toString();
      this._check();
    });
    this.proc.stderr.on('data', (c) => {
      this.stderrBuf += c.toString();
    });
    const pidRes = await this.exec('SELECT pg_backend_pid();');
    this.pid = Number(pidRes.stdout.trim());
    return this.pid;
  }

  _check() {
    if (!this.pending) return;
    const idx = this.stdoutBuf.indexOf(this.pending.marker);
    if (idx !== -1) {
      const out = this.stdoutBuf.slice(0, idx).trim();
      this.stdoutBuf = this.stdoutBuf
        .slice(idx + this.pending.marker.length)
        .replace(/^\r?\n/, '');
      const err = this.stderrBuf.trim();
      this.stderrBuf = '';
      if (this.pending.timer) clearTimeout(this.pending.timer);
      const resolve = this.pending.resolve;
      this.pending = null;
      const m = err.match(/^(?:ERROR|ERRO):\s+([0-9A-Z]{5}):/m);
      resolve({
        stdout: out,
        stderr: err,
        sqlstate: m ? m[1] : null,
        hasError: Boolean(m || /^(?:ERROR|ERRO):/m.test(err)),
      });
    }
  }

  exec(sql, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      if (this.pending) {
        reject(new Error(`Sessão ${this.name} ocupada`));
        return;
      }
      const marker = `__END_${++this.seq}_${Date.now()}__`;
      const timer = setTimeout(() => {
        if (this.pending && this.pending.marker === marker) {
          const errOut = this.stderrBuf;
          this.pending = null;
          reject(new Error(`Timeout na sessão ${this.name} para SQL: ${sql}\nSTDERR: ${errOut}`));
        }
      }, timeoutMs);
      this.pending = { marker, resolve, reject, timer };
      this.stderrBuf = '';
      this.proc.stdin.write(`${sql}\n\\echo ${marker}\n`);
      this._check();
    });
  }

  sendAsync(sql) {
    if (this.pending) throw new Error(`Sessão ${this.name} ocupada`);
    const marker = `__END_${++this.seq}_${Date.now()}__`;
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending && this.pending.marker === marker) {
          this.pending = null;
          reject(new Error(`Timeout async em ${this.name}: ${sql}`));
        }
      }, 15000);
      this.pending = { marker, resolve, reject, timer };
      this.stderrBuf = '';
    });
    this.proc.stdin.write(`${sql}\n\\echo ${marker}\n`);
    return promise;
  }

  async close() {
    if (!this.proc) return;
    try {
      this.proc.stdin.end('\\q\n');
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 150));
    if (!this.proc.killed) {
      try {
        this.proc.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }
  }
}

async function execSqlFile(filePath, db = ISO_DB) {
  return runCommand(PSQL_EXE, [
    '-h', HOST, '-p', String(PORT), '-U', 'postgres', '-d', db,
    '-X', '-v', 'ON_ERROR_STOP=1', '-f', filePath,
  ]);
}

async function execSql(sql, db = ISO_DB) {
  return runCommand(PSQL_EXE, [
    '-h', HOST, '-p', String(PORT), '-U', 'postgres', '-d', db,
    '-X', '-v', 'ON_ERROR_STOP=1', '-c', sql,
  ]);
}

function asAuth(uid) {
  return `SELECT set_config('request.jwt.claim.sub', '${uid}', true), set_config('request.jwt.claim.role', 'authenticated', true), set_config('request.jwt.claims', '{"sub":"${uid}","role":"authenticated"}', true); SET LOCAL ROLE authenticated;`;
}

function asAnon() {
  return `SELECT set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claim.role', 'anon', true), set_config('request.jwt.claims', '', true); SET LOCAL ROLE anon;`;
}

const lastLine = (s) => (s || '').trim().split(/\r?\n/).pop().trim();

const results = [];
function record(id, category, description, expected, actual, passed) {
  results.push({ id, category, description, expected, actual, status: passed ? 'PASS' : 'FAIL' });
  const tag = passed ? 'PASS' : 'FAIL';
  console.log(`  [${tag}] ${id} — ${description} (${actual})`);
}

async function main() {
  console.log('====================================================================');
  console.log('VEXOR — Etapa 9.7 (Fase 2A) — Testes Locais Isolados (PostgreSQL 18)');
  console.log('====================================================================');

  const pgState = await ensureLocalPostgresRunning();
  const sessions = [];

  try {
    // 1. Criar banco temporário isolado (sem tocar em vexor_audit)
    await execSql(`DROP DATABASE IF EXISTS ${ISO_DB};`, 'postgres');
    const createRes = await execSql(`CREATE DATABASE ${ISO_DB};`, 'postgres');
    if (createRes.code !== 0) {
      throw new Error(`Falha ao criar ${ISO_DB}: ${createRes.stderr}`);
    }
    console.log(`Banco temporário isolado criado: ${ISO_DB}`);

    // 2. Aplicar bootstrap + 4 migrations oficiais + proposta 2A (transações separadas)
    const filesToApply = [
      ['bootstrap', 'scripts/security-audit/00-bootstrap-local-db.sql'],
      ['migration-01', 'supabase/migrations/20261110000001_schema.sql'],
      ['migration-02', 'supabase/migrations/20261110000002_functions_triggers.sql'],
      ['migration-03', 'supabase/migrations/20261110000003_rls_and_grants.sql'],
      ['migration-04-hardening', 'supabase/migrations/20261113143000_security_hardening.sql'],
      ['proposal-2a', 'scripts/security-audit/etapa-9-7/phase-2a/PROPOSED-MIGRATION-2A-TEST.sql'],
    ];

    for (const [label, relPath] of filesToApply) {
      const res = await execSqlFile(path.join(projectRoot, relPath));
      if (res.code !== 0) {
        throw new Error(`Falha ao aplicar ${label} (${relPath}):\n${res.stderr || res.stdout}`);
      }
      console.log(`  Aplicado com sucesso: ${relPath}`);
    }

    // Conceder USAGE no schema extensions (padrão canônico do Supabase) sem alterar 00-bootstrap-local-db.sql
    const extGrantRes = await execSql('GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;');
    if (extGrantRes.code !== 0) {
      throw new Error(`Falha ao conceder USAGE em extensions: ${extGrantRes.stderr}`);
    }

    // 3. Seed em transação separada (após commit do ALTER TYPE)
    const seedRes = await execSqlFile(path.join(projectRoot, 'supabase/seed.sql'));
    if (seedRes.code !== 0) {
      throw new Error(`Falha ao aplicar supabase/seed.sql: ${seedRes.stderr}`);
    }

    const researchSeedSql = `
      INSERT INTO public.categories (slug, name_en, name_pt, scope, sort_order) VALUES
        ('ransomware-operations', 'Ransomware Operations', 'Operações de Ransomware', 'research', 200),
        ('apt-campaigns', 'APT Campaigns', 'Campanhas APT', 'research', 210),
        ('forum-only-cat', 'Forum Only', 'Apenas Fórum', 'forum', 220),
        ('inactive-research-cat', 'Inactive Research', 'Pesquisa Inativa', 'research', 230)
      ON CONFLICT (slug) DO NOTHING;
      UPDATE public.categories SET is_active = false WHERE slug = 'inactive-research-cat';

      INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
        ('${UID.admin}',     'admin2a@vexor.test',     '{"username":"admin_2a"}'::jsonb),
        ('${UID.mod}',       'mod2a@vexor.test',       '{"username":"mod_2a"}'::jsonb),
        ('${UID.author}',    'author2a@vexor.test',    '{"username":"author_2a"}'::jsonb),
        ('${UID.member}',    'member2a@vexor.test',    '{"username":"member_2a"}'::jsonb),
        ('${UID.recipient}', 'recipient2a@vexor.test', '{"username":"recipient_2a"}'::jsonb),
        ('${UID.suspended}', 'suspended2a@vexor.test', '{"username":"suspended_2a"}'::jsonb);

      UPDATE public.profiles SET role = 'admin',     is_suspended = false WHERE id = '${UID.admin}';
      UPDATE public.profiles SET role = 'moderator', is_suspended = false WHERE id = '${UID.mod}';
      UPDATE public.profiles SET role = 'member',    is_suspended = true  WHERE id = '${UID.suspended}';
    `;
    const seedTmpPath = path.join(projectRoot, 'scripts/security-audit/etapa-9-7/phase-2a/.tmp-seed-2a.sql');
    fs.writeFileSync(seedTmpPath, researchSeedSql, 'utf8');
    let rSeed;
    try {
      rSeed = await execSqlFile(seedTmpPath);
    } finally {
      if (fs.existsSync(seedTmpPath)) fs.unlinkSync(seedTmpPath);
    }
    if (rSeed.code !== 0) {
      throw new Error(`Falha no seed de research/usuários: ${rSeed.stderr}`);
    }

    // Conectar sessões isoladas
    const s = new IsolatedPsqlSession('main', ISO_DB);
    const sB = new IsolatedPsqlSession('sessB', ISO_DB);
    const sC = new IsolatedPsqlSession('sessC', ISO_DB);
    await s.connect();
    await sB.connect();
    await sC.connect();
    sessions.push(s, sB, sC);

    // Helper para buscar IDs de categorias
    const catRes = await s.exec(`
      SELECT
        (SELECT id FROM public.categories WHERE slug = 'ransomware-operations'),
        (SELECT id FROM public.categories WHERE slug = 'forum-only-cat'),
        (SELECT id FROM public.categories WHERE slug = 'inactive-research-cat');
    `);
    const [CAT_RESEARCH, CAT_FORUM, CAT_INACTIVE] = catRes.stdout.split('|').map((x) => x.trim());

    // Criar pesquisas fixture (CLEAR, GREEN, AMBER, AMBER+, RED, PENDING, REJECTED) como author
    const insertFixture = async (title, tlp) => {
      const r = await s.exec(`
        BEGIN;
        ${asAuth(UID.author)}
        INSERT INTO public.research_submissions (
          category_id, title_pt, summary_pt, body_pt, domain, severity, tlp,
          cves, attack_techniques, source_references
        ) VALUES (
          '${CAT_RESEARCH}',
          '${title}',
          'Resumo técnico detalhado para validação isolada do módulo Cybercrime Research.',
          'Corpo técnico completo com análise defensiva, indicadores e metodologia documentada.',
          'ransomware', 'high', '${tlp}',
          ARRAY['CVE-2024-12345'], ARRAY['T1059.001'],
          '[{"title":"MITRE ATT&CK","url":"https://attack.mitre.org","isExternal":true}]'::jsonb
        ) RETURNING id;
        COMMIT;
      `);
      if (r.hasError) throw new Error(`Fixture ${title} falhou: ${r.stderr}`);
      return r.stdout.split('\n').pop().trim();
    };

    const ID_CLEAR = await insertFixture('Pesquisa TLP CLEAR 2A', 'CLEAR');
    const ID_GREEN = await insertFixture('Pesquisa TLP GREEN 2A', 'GREEN');
    const ID_AMBER = await insertFixture('Pesquisa TLP AMBER 2A', 'AMBER');
    const ID_AMBER_P = await insertFixture('Pesquisa TLP AMBER PLUS 2A', 'AMBER+');
    const ID_RED = await insertFixture('Pesquisa TLP RED 2A', 'RED');
    const ID_PENDING = await insertFixture('Pesquisa Pendente Privada 2A', 'CLEAR');
    const ID_REJECTED = await insertFixture('Pesquisa Rejeitada 2A', 'AMBER');

    // Aprovar CLEAR, GREEN, AMBER, AMBER+, RED e rejeitar ID_REJECTED como mod
    for (const id of [ID_CLEAR, ID_GREEN, ID_AMBER, ID_AMBER_P, ID_RED]) {
      const r = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.moderate_research('${id}', 'approved', NULL); COMMIT;`);
      if (r.hasError) throw new Error(`Aprovação fixture falhou: ${r.stderr}`);
    }
    {
      const r = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.moderate_research('${ID_REJECTED}', 'rejected', 'Falta detalhamento técnico suficiente'); COMMIT;`);
      if (r.hasError) throw new Error(`Rejeição fixture falhou: ${r.stderr}`);
    }

    // =========================================================================
    // EXECUÇÃO DOS CENÁRIOS
    // =========================================================================

    // RPC-01: p_decision IS NULL em moderate_research -> SQLSTATE 22023
    {
      const r = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.moderate_research('${ID_PENDING}', NULL, 'teste'); ROLLBACK;`);
      record('RPC-01', 'RPC', 'moderate_research rejeita p_decision NULL com 22023', 'SQLSTATE 22023', `sqlstate=${r.sqlstate}`, r.sqlstate === '22023');
    }

    // T01: RLS sem recursão (autor, destinatário, membro, moderador, e autor em research_recipients)
    {
      await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.grant_research_recipient('${ID_RED}', '${UID.recipient}', 'Autorização T01'); COMMIT;`);
      const r1 = await s.exec(`BEGIN; ${asAuth(UID.author)} SELECT count(*) FROM public.research_submissions WHERE id = '${ID_RED}'; ROLLBACK;`);
      const r2 = await s.exec(`BEGIN; ${asAuth(UID.recipient)} SELECT count(*) FROM public.research_submissions WHERE id = '${ID_RED}'; ROLLBACK;`);
      const r3 = await s.exec(`BEGIN; ${asAuth(UID.author)} SELECT count(*) FROM public.research_recipients WHERE research_id = '${ID_RED}'; ROLLBACK;`);
      const r4 = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT count(*) FROM public.research_recipients WHERE research_id = '${ID_RED}'; ROLLBACK;`);
      const a1 = lastLine(r1.stdout), a2 = lastLine(r2.stdout), a3 = lastLine(r3.stdout), a4 = lastLine(r4.stdout);
      const ok = !r1.hasError && a1 === '1' && !r2.hasError && a2 === '1' && !r3.hasError && a3 === '1' && !r4.hasError && a4 === '1';
      record('T01', 'RLS', 'RLS sem recursão (42P17 ausente) entre research_submissions e research_recipients', '1/1/1/1 sem erro', `author=${a1},rec=${a2},author_rr=${a3},mod_rr=${a4},err=${r1.sqlstate || r3.sqlstate}`, ok);
    }

    // T02: Todos os níveis TLP + usuário anônimo
    {
      const rAnon = await s.exec(`BEGIN; ${asAnon()} SELECT count(*) FROM public.research_submissions; ROLLBACK;`);
      const rMemClear = await s.exec(`BEGIN; ${asAuth(UID.member)} SELECT count(*) FROM public.research_submissions WHERE id IN ('${ID_CLEAR}','${ID_GREEN}'); ROLLBACK;`);
      const rMemRestr = await s.exec(`BEGIN; ${asAuth(UID.member)} SELECT count(*) FROM public.research_submissions WHERE id IN ('${ID_AMBER}','${ID_AMBER_P}','${ID_RED}','${ID_PENDING}','${ID_REJECTED}'); ROLLBACK;`);
      const cg = lastLine(rMemClear.stdout), restr = lastLine(rMemRestr.stdout);
      const ok = rAnon.sqlstate === '42501' && cg === '2' && restr === '0';
      record('T02', 'TLP/RLS', 'Membro lê CLEAR/GREEN aprovados, nunca lê AMBER/AMBER+/RED/pendente sem grant; anon bloqueado (42501)', 'anon=42501,clear_green=2,restr=0', `anon=${rAnon.sqlstate},cg=${cg},restr=${restr}`, ok);
    }

    // T03: Matriz de papéis (autor edita pending, membro/mod não editam via UPDATE direto, DELETE bloqueado)
    {
      const rAuthUpd = await s.exec(`BEGIN; ${asAuth(UID.author)} UPDATE public.research_submissions SET read_time_minutes = 15 WHERE id = '${ID_PENDING}'; ROLLBACK;`);
      const rMemUpd = await s.exec(`BEGIN; ${asAuth(UID.member)} UPDATE public.research_submissions SET read_time_minutes = 15 WHERE id = '${ID_PENDING}'; ROLLBACK;`);
      const rAuthDel = await s.exec(`BEGIN; ${asAuth(UID.author)} DELETE FROM public.research_submissions WHERE id = '${ID_PENDING}'; ROLLBACK;`);
      const rModAll = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT count(*) FROM public.research_submissions WHERE id IN ('${ID_PENDING}','${ID_REJECTED}','${ID_RED}'); ROLLBACK;`);
      const rAdmAll = await s.exec(`BEGIN; ${asAuth(UID.admin)} SELECT count(*) FROM public.research_submissions WHERE id IN ('${ID_PENDING}','${ID_REJECTED}','${ID_RED}'); ROLLBACK;`);
      const mAll = lastLine(rModAll.stdout), aAll = lastLine(rAdmAll.stdout);
      const ok = !rAuthUpd.hasError && !rMemUpd.hasError && rAuthDel.sqlstate === '42501' && mAll === '3' && aAll === '3';
      record('T03', 'RLS', 'Papéis: autor edita pending, DELETE negado (42501), mod/admin leem todos os status', 'upd_ok,del=42501,mod=3,adm=3', `del=${rAuthDel.sqlstate},mod=${mAll},adm=${aAll}`, ok);
    }

    // T04: Perfil suspenso e perfil inexistente
    {
      const rSuspSel = await s.exec(`BEGIN; ${asAuth(UID.suspended)} SELECT count(*) FROM public.research_submissions; ROLLBACK;`);
      const rSuspRpc = await s.exec(`BEGIN; ${asAuth(UID.suspended)} SELECT public.resubmit_research('${ID_REJECTED}','${CAT_RESEARCH}','Titulo X','Resumo tecnico valido com mais de vinte chars.','Corpo tecnico valido com mais de vinte caracteres.', 'ransomware','high','AMBER'); ROLLBACK;`);
      const rOrpSel = await s.exec(`BEGIN; ${asAuth(UID.orphan)} SELECT count(*) FROM public.research_submissions; ROLLBACK;`);
      const rOrpRpc = await s.exec(`BEGIN; ${asAuth(UID.orphan)} SELECT public.moderate_research('${ID_PENDING}','approved',NULL); ROLLBACK;`);
      const sSel = lastLine(rSuspSel.stdout), oSel = lastLine(rOrpSel.stdout);
      const ok = sSel === '0' && rSuspRpc.sqlstate === '42501' && oSel === '0' && rOrpRpc.sqlstate === '42501';
      record('T04', 'Auth', 'Perfil suspenso e inexistente bloqueados em RLS (0 linhas) e RPCs (42501)', '0/42501/0/42501', `susp=${sSel}/${rSuspRpc.sqlstate},orp=${oSel}/${rOrpRpc.sqlstate}`, ok);
    }

    // T05: Autoconcessão e INSERT direto em research_recipients
    {
      const rSelf = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.grant_research_recipient('${ID_RED}','${UID.mod}','Auto'); ROLLBACK;`);
      const rDir = await s.exec(`BEGIN; ${asAuth(UID.member)} INSERT INTO public.research_recipients (research_id, user_id) VALUES ('${ID_RED}','${UID.member}'); ROLLBACK;`);
      const ok = rSelf.sqlstate === '42501' && rDir.sqlstate === '42501';
      record('T05', 'TLP', 'Autoconcessão e INSERT direto em research_recipients bloqueados (42501)', '42501/42501', `self=${rSelf.sqlstate},direct=${rDir.sqlstate}`, ok);
    }

    // T06: Concessão duplicada (idempotência)
    {
      await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.grant_research_recipient('${ID_AMBER}','${UID.recipient}','Justificativa inicial'); COMMIT;`);
      const cntBefore = await s.exec(`SELECT count(*) FROM public.audit_logs WHERE entity_id = '${ID_AMBER}' AND action LIKE 'research.recipient%';`);
      const rDup = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.grant_research_recipient('${ID_AMBER}','${UID.recipient}','Justificativa inicial'); COMMIT;`);
      const cntAfter = await s.exec(`SELECT count(*) FROM public.audit_logs WHERE entity_id = '${ID_AMBER}' AND action LIKE 'research.recipient%';`);
      const ok = !rDup.hasError && cntBefore.stdout === '1' && cntAfter.stdout === '1';
      record('T06', 'TLP', 'Concessão duplicada idêntica é idempotente sem duplicar audit_logs', 'before=1,after=1', `before=${cntBefore.stdout},after=${cntAfter.stdout}`, ok);
    }

    // T07: Atualização de justificativa (preserva granted_by e registra research.recipient_updated)
    {
      const rUpd = await s.exec(`BEGIN; ${asAuth(UID.admin)} SELECT public.grant_research_recipient('${ID_AMBER}','${UID.recipient}','Nova justificativa auditada'); COMMIT;`);
      const row = await s.exec(`SELECT granted_by, updated_by, justification FROM public.research_recipients WHERE research_id='${ID_AMBER}' AND user_id='${UID.recipient}';`);
      const aud = await s.exec(`SELECT action FROM public.audit_logs WHERE entity_id='${ID_AMBER}' ORDER BY id DESC LIMIT 1;`);
      const [gb, ub, j] = row.stdout.split('|');
      const ok = !rUpd.hasError && gb === UID.mod && ub === UID.admin && j === 'Nova justificativa auditada' && aud.stdout === 'research.recipient_updated';
      record('T07', 'TLP', 'Atualização de justificativa preserva granted_by original e grava research.recipient_updated', 'gb=mod,ub=admin,action=recipient_updated', `gb=${gb},ub=${ub},action=${aud.stdout}`, ok);
    }

    // T08: Revogação + idempotência + perda imediata de leitura
    {
      const rRev1 = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.revoke_research_recipient('${ID_AMBER}','${UID.recipient}'); COMMIT;`);
      const rRev2 = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.revoke_research_recipient('${ID_AMBER}','${UID.recipient}'); COMMIT;`);
      const rRead = await s.exec(`BEGIN; ${asAuth(UID.recipient)} SELECT count(*) FROM public.research_submissions WHERE id='${ID_AMBER}'; ROLLBACK;`);
      const cntRev = await s.exec(`SELECT count(*) FROM public.audit_logs WHERE entity_id='${ID_AMBER}' AND action='research.recipient_revoked';`);
      const rCnt = lastLine(rRead.stdout);
      const ok = !rRev1.hasError && !rRev2.hasError && rCnt === '0' && cntRev.stdout === '1';
      record('T08', 'TLP', 'Revogação remove acesso imediato, registra 1 evento e repetição é idempotente', 'read=0,rev_logs=1', `read=${rCnt},rev_logs=${cntRev.stdout}`, ok);
    }

    // T09: Bloqueio de grant em CLEAR / GREEN
    {
      const rC = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.grant_research_recipient('${ID_CLEAR}','${UID.member}',NULL); ROLLBACK;`);
      const rG = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.grant_research_recipient('${ID_GREEN}','${UID.member}',NULL); ROLLBACK;`);
      const ok = rC.sqlstate === '22023' && rG.sqlstate === '22023';
      record('T09', 'TLP', 'Concessão explícita para CLEAR/GREEN bloqueada (22023)', '22023/22023', `clear=${rC.sqlstate},green=${rG.sqlstate}`, ok);
    }

    // T10: Mudança de status e transições inválidas (approved -> archived revoga leitura; archived -> * bloqueado)
    {
      const rArc = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.moderate_research('${ID_RED}','archived',NULL); COMMIT;`);
      const rReadAfter = await s.exec(`BEGIN; ${asAuth(UID.recipient)} SELECT count(*) FROM public.research_submissions WHERE id='${ID_RED}'; ROLLBACK;`);
      const rGrantArc = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.grant_research_recipient('${ID_RED}','${UID.member}','Justificativa valida'); ROLLBACK;`);
      const rArcToApp = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.moderate_research('${ID_RED}','approved',NULL); ROLLBACK;`);
      const rAppToRej = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.moderate_research('${ID_AMBER}','rejected','Motivo valido'); ROLLBACK;`);
      const rRejToApp = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.moderate_research('${ID_REJECTED}','approved',NULL); ROLLBACK;`);
      const rAfter = lastLine(rReadAfter.stdout);
      const ok = !rArc.hasError && rAfter === '0' && rGrantArc.sqlstate === '22023' && rArcToApp.sqlstate === '22023' && rAppToRej.sqlstate === '22023' && rRejToApp.sqlstate === '22023';
      record('T10', 'State', 'Arquivamento bloqueia leitura de destinatário, e transições fora da matriz falham (22023)', 'read=0,4x22023', `read=${rAfter},errs=${rGrantArc.sqlstate}/${rArcToApp.sqlstate}/${rAppToRej.sqlstate}/${rRejToApp.sqlstate}`, ok);
    }

    // T11: Concorrência TOCTOU — moderação vs rebaixamento de papel (Padrão V4)
    {
      // Sessão B trava a pesquisa pendente; Sessão A entra em moderate_research (passa is_moderator() e bloqueia em FOR UPDATE);
      // Sessão C rebaixa mod -> member e comita; Sessão B libera lock; Sessão A revalida pós-lock e falha com 42501!
      await sB.exec(`BEGIN; SELECT 1 FROM public.research_submissions WHERE id='${ID_PENDING}' FOR UPDATE;`);
      const pA = s.sendAsync(`BEGIN; ${asAuth(UID.mod)} SELECT public.moderate_research('${ID_PENDING}','approved',NULL);`);
      await new Promise((r) => setTimeout(r, 250));
      const rDemote = await sC.exec(`BEGIN; ${asAuth(UID.admin)} SELECT public.admin_set_user_role('${UID.mod}','member'); COMMIT;`);
      await sB.exec(`ROLLBACK;`);
      const rA = await pA;
      await s.exec(`ROLLBACK;`);
      // Restaurar papel de mod para os próximos testes
      await sC.exec(`BEGIN; ${asAuth(UID.admin)} SELECT public.admin_set_user_role('${UID.mod}','moderator'); COMMIT;`);
      const ok = !rDemote.hasError && rA.sqlstate === '42501';
      record('T11', 'Concurrency', 'Revalidação pós-lock V4 bloqueia moderador rebaixado concorrentemente (42501)', 'demote_ok,mod=42501', `demote_err=${rDemote.sqlstate},mod=${rA.sqlstate}`, ok);
    }

    // T12: SQLSTATE 55P03 (lock_not_available em FOR SHARE NOWAIT)
    {
      await sB.exec(`BEGIN; SELECT 1 FROM public.profiles WHERE id='${UID.mod}' FOR UPDATE;`);
      const r55 = await s.exec(`BEGIN; ${asAuth(UID.mod)} SELECT public.moderate_research('${ID_PENDING}','approved',NULL); ROLLBACK;`);
      await sB.exec(`ROLLBACK;`);
      const ok = r55.sqlstate === '55P03';
      record('T12', 'Concurrency', 'Contenção em profiles FOR SHARE NOWAIT retorna SQLSTATE 55P03 imediato', 'SQLSTATE 55P03', `sqlstate=${r55.sqlstate}`, ok);
    }

    // T13: Auditoria (eventos e imutabilidade append-only)
    {
      const rUpdAud = await s.exec(`BEGIN; UPDATE public.audit_logs SET action='tampered' WHERE entity_type='research'; ROLLBACK;`);
      const rCntAud = await s.exec(`SELECT count(*) FROM public.audit_logs WHERE entity_type='research';`);
      const ok = rUpdAud.sqlstate === '42501' && Number(rCntAud.stdout) >= 7;
      record('T13', 'Audit', 'audit_logs registra eventos research.* e bloqueia mutação (42501)', 'mut=42501,count>=7', `mut=${rUpdAud.sqlstate},count=${rCntAud.stdout}`, ok);
    }

    // T14: Notificações (autor ativo recebe; suspenso não recebe)
    {
      const rNotif = await s.exec(`SELECT count(*) FROM public.notifications WHERE user_id='${UID.author}' AND type IN ('research_approved','research_rejected');`);
      const rSuspNotif = await s.exec(`SELECT count(*) FROM public.notifications WHERE user_id='${UID.suspended}';`);
      const ok = Number(rNotif.stdout) >= 2 && rSuspNotif.stdout === '0';
      record('T14', 'Notifications', 'Notificações research_approved/research_rejected criadas para autor ativo', 'author>=2,susp=0', `author=${rNotif.stdout},susp=${rSuspNotif.stdout}`, ok);
    }

    // T15: Proteção de campos administrativos contra UPDATE direto
    {
      const rF1 = await s.exec(`BEGIN; ${asAuth(UID.author)} UPDATE public.research_submissions SET status='approved' WHERE id='${ID_PENDING}'; ROLLBACK;`);
      const rF2 = await s.exec(`BEGIN; ${asAuth(UID.author)} UPDATE public.research_submissions SET slug='hacked-slug' WHERE id='${ID_PENDING}'; ROLLBACK;`);
      const rF3 = await s.exec(`BEGIN; ${asAuth(UID.author)} UPDATE public.research_submissions SET reviewed_by='${UID.author}' WHERE id='${ID_PENDING}'; ROLLBACK;`);
      const ok = rF1.sqlstate === '42501' && rF2.sqlstate === '42501' && rF3.sqlstate === '42501';
      record('T15', 'Integrity', 'UPDATE direto em status/slug/reviewed_by bloqueado (42501)', '3x42501', `${rF1.sqlstate}/${rF2.sqlstate}/${rF3.sqlstate}`, ok);
    }

    // T16: Arrays e JSONB inválidos
    {
      const rArrNull = await s.exec(`BEGIN; ${asAuth(UID.author)} INSERT INTO public.research_submissions (category_id,title_pt,summary_pt,body_pt,domain,cves) VALUES ('${CAT_RESEARCH}','Teste Array Null','Resumo tecnico valido com mais de vinte chars.','Corpo tecnico valido com mais de vinte chars.','apt',ARRAY['CVE-2024-1234',NULL]); ROLLBACK;`);
      const rArrDup = await s.exec(`BEGIN; ${asAuth(UID.author)} INSERT INTO public.research_submissions (category_id,title_pt,summary_pt,body_pt,domain,attack_techniques) VALUES ('${CAT_RESEARCH}','Teste Array Dup','Resumo tecnico valido com mais de vinte chars.','Corpo tecnico valido com mais de vinte chars.','apt',ARRAY['T1059','T1059']); ROLLBACK;`);
      const rJsonExtra = await s.exec(`BEGIN; ${asAuth(UID.author)} INSERT INTO public.research_submissions (category_id,title_pt,summary_pt,body_pt,domain,source_references) VALUES ('${CAT_RESEARCH}','Teste JSON Extra','Resumo tecnico valido com mais de vinte chars.','Corpo tecnico valido com mais de vinte chars.','apt','[{"title":"Ref","evil":1}]'::jsonb); ROLLBACK;`);
      const rJsonHttp = await s.exec(`BEGIN; ${asAuth(UID.author)} INSERT INTO public.research_submissions (category_id,title_pt,summary_pt,body_pt,domain,source_references) VALUES ('${CAT_RESEARCH}','Teste JSON HTTP','Resumo tecnico valido com mais de vinte chars.','Corpo tecnico valido com mais de vinte chars.','apt','[{"title":"Ref","url":"http://insecure.test"}]'::jsonb); ROLLBACK;`);
      const ok = rArrNull.sqlstate === '23514' && rArrDup.sqlstate === '23514' && rJsonExtra.sqlstate === '22023' && rJsonHttp.sqlstate === '22023';
      record('T16', 'Integrity', 'Arrays (NULL/duplicado) e JSONB (chave extra/http://) rejeitados', '23514/23514/22023/22023', `${rArrNull.sqlstate}/${rArrDup.sqlstate}/${rJsonExtra.sqlstate}/${rJsonHttp.sqlstate}`, ok);
    }

    // T17: Denúncias (reports) e anti-enumeração de pesquisas privadas
    {
      const rRepOk = await s.exec(`BEGIN; ${asAuth(UID.member)} INSERT INTO public.reports (research_id, reason, details) VALUES ('${ID_CLEAR}','spam','Teste de denúncia'); COMMIT;`);
      const rRepDup = await s.exec(`BEGIN; ${asAuth(UID.member)} INSERT INTO public.reports (research_id, reason) VALUES ('${ID_CLEAR}','spam'); ROLLBACK;`);
      const rRepPriv = await s.exec(`BEGIN; ${asAuth(UID.member)} INSERT INTO public.reports (research_id, reason) VALUES ('${ID_AMBER_P}','spam'); ROLLBACK;`);
      const rRepFake = await s.exec(`BEGIN; ${asAuth(UID.member)} INSERT INTO public.reports (research_id, reason) VALUES ('00000000-0000-0000-0000-111111111111','spam'); ROLLBACK;`);
      const ok = !rRepOk.hasError && rRepDup.sqlstate === '23505' && rRepPriv.sqlstate === '42501' && rRepFake.sqlstate === '42501';
      record('T17', 'Reports', 'Denúncia válida aceita, duplicata=23505, pesquisa restrita e UUID inexistente=42501 uniformes', 'ok,23505,42501,42501', `dup=${rRepDup.sqlstate},priv=${rRepPriv.sqlstate},fake=${rRepFake.sqlstate}`, ok);
    }

    // T18: Reenvio (resubmit_research), categoria inválida/inativa e rollback transacional
    {
      const rResub = await s.exec(`BEGIN; ${asAuth(UID.author)} SELECT public.resubmit_research('${ID_REJECTED}','${CAT_RESEARCH}','Pesquisa Corrigida 2A','Resumo corrigido valido com mais de vinte chars.','Corpo corrigido valido com mais de vinte chars.','ransomware','high','AMBER'); COMMIT;`);
      const rResubCheck = await s.exec(`SELECT status, rejection_reason IS NULL FROM public.research_submissions WHERE id='${ID_REJECTED}';`);
      const rCatForum = await s.exec(`BEGIN; ${asAuth(UID.author)} INSERT INTO public.research_submissions (category_id,title_pt,summary_pt,body_pt,domain) VALUES ('${CAT_FORUM}','Teste Cat Forum','Resumo tecnico valido com mais de vinte chars.','Corpo tecnico valido com mais de vinte chars.','apt'); ROLLBACK;`);
      const rCatInact = await s.exec(`BEGIN; ${asAuth(UID.author)} INSERT INTO public.research_submissions (category_id,title_pt,summary_pt,body_pt,domain) VALUES ('${CAT_INACTIVE}','Teste Cat Inativa','Resumo tecnico valido com mais de vinte chars.','Corpo tecnico valido com mais de vinte chars.','apt'); ROLLBACK;`);
      const ok = !rResub.hasError && rResubCheck.stdout === 'pending|t' && rCatForum.sqlstate === '22023' && rCatInact.sqlstate === '22023';
      record('T18', 'Integrity', 'resubmit_research limpa revisão -> pending; categoria forum/inativa rejeitada (22023)', 'pending|t,22023,22023', `${rResubCheck.stdout},${rCatForum.sqlstate},${rCatInact.sqlstate}`, ok);
    }

    // T19: Privilégios de funções SECURITY DEFINER para anon
    {
      const rAnonRpc = await s.exec(`BEGIN; ${asAnon()} SELECT public.moderate_research('${ID_PENDING}','approved',NULL); ROLLBACK;`);
      const rAnonHelper = await s.exec(`BEGIN; ${asAnon()} SELECT public.is_research_author('${ID_CLEAR}'); ROLLBACK;`);
      const ok = rAnonRpc.sqlstate === '42501' && rAnonHelper.sqlstate === '42501';
      record('T19', 'Privileges', 'anon bloqueado (42501) em RPCs SECURITY DEFINER e is_research_author', '42501/42501', `${rAnonRpc.sqlstate}/${rAnonHelper.sqlstate}`, ok);
    }

    const passedCount = results.filter((r) => r.status === 'PASS').length;
    const failedCount = results.filter((r) => r.status === 'FAIL').length;

    fs.writeFileSync(
      RESULTS_PATH,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          database: ISO_DB,
          total: results.length,
          passed: passedCount,
          failed: failedCount,
          results,
        },
        null,
        2
      )
    );

    console.log(`\nRESUMO: ${passedCount}/${results.length} cenários aprovados (${failedCount} falhas).`);
    if (failedCount > 0) {
      process.exitCode = 1;
    }
  } finally {
    for (const sess of sessions) {
      await sess.close();
    }
    try {
      await execSql(`DROP DATABASE IF EXISTS ${ISO_DB};`, 'postgres');
      console.log(`Banco temporário descartável removido: ${ISO_DB}`);
    } catch (e) {
      console.error(`Aviso ao remover ${ISO_DB}:`, e.message);
    }
    await stopLocalPostgresIfStarted(pgState);
  }
}

main().catch((err) => {
  console.error('ERRO FATAL:', err);
  process.exit(1);
});
