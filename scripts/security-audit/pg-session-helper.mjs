/**
 * VEXOR — ETAPA 9.1.3.7: HELPER DE SESSÕES INDEPENDENTES POSTGRESQL LOCAL
 * Apenas para ambiente local descartável: 127.0.0.1:5433 / vexor_audit / .pg_test_cluster.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectRoot = path.resolve(__dirname, '../..');

export const BIN_DIR = 'C:\\Program Files\\PostgreSQL\\18\\bin';
export const POSTGRES_EXE = path.join(BIN_DIR, 'postgres.exe');
export const PSQL_EXE = path.join(BIN_DIR, 'psql.exe');
export const PG_ISREADY_EXE = path.join(BIN_DIR, 'pg_isready.exe');
export const PG_CTL_EXE = path.join(BIN_DIR, 'pg_ctl.exe');
export const CLUSTER_DIR = path.join(projectRoot, '.pg_test_cluster');
export const PORT = 5433;
export const HOST = '127.0.0.1';
export const DB_NAME = 'vexor_audit';

export function runCommand(exe, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(exe, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }));
    proc.on('error', reject);
  });
}

export async function isPostgresReady() {
  const res = await runCommand(PG_ISREADY_EXE, ['-h', HOST, '-p', String(PORT), '-t', '2']);
  return res.code === 0;
}

export async function ensureLocalPostgresRunning() {
  const statusRes = await runCommand(PG_CTL_EXE, ['-D', CLUSTER_DIR, 'status']);
  if (statusRes.code === 0 && await isPostgresReady()) {
    return { startedByUs: false, pgProc: null };
  }
  const pidFile = path.join(CLUSTER_DIR, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    try { fs.unlinkSync(pidFile); } catch { /* ignore */ }
  }
  const pgProc = spawn(POSTGRES_EXE, ['-D', CLUSTER_DIR, '-p', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    windowsHide: true
  });
  let pgOut = '';
  let pgErr = '';
  pgProc.stdout.on('data', d => { pgOut += d.toString(); });
  pgProc.stderr.on('data', d => { pgErr += d.toString(); });
  const start = Date.now();
  while (Date.now() - start < 30000) {
    if (pgErr.includes('pronto para aceitar conex') || pgErr.includes('ready to accept connections')) {
      if (await isPostgresReady()) {
        return { startedByUs: true, pgProc };
      }
    }
    await new Promise(r => setTimeout(r, 250));
  }
  try { pgProc.kill(); } catch { /* ignore */ }
  throw new Error(`Timeout aguardando PostgreSQL local ficar pronto. stdout=${pgOut} stderr=${pgErr}`);
}

export async function stopLocalPostgresIfStarted(startedByUs) {
  if (!startedByUs) return;
  await runCommand(PG_CTL_EXE, ['-D', CLUSTER_DIR, 'stop', '-m', 'fast']);
}

export function runPsqlOnce(sql, extraArgs = []) {
  return runCommand(PSQL_EXE, [
    '-h', HOST,
    '-p', String(PORT),
    '-U', 'postgres',
    '-d', DB_NAME,
    '-X', '-A', '-t',
    '-v', 'VERBOSITY=verbose',
    ...extraArgs,
    '-c', sql
  ]);
}

export async function verifyServerIdentity() {
  const res = await runPsqlOnce(
    "SELECT coalesce(host(inet_server_addr()), 'local') || '|' || inet_server_port()::text || '|' || current_database() || '|' || version();"
  );
  if (res.code !== 0) {
    throw new Error(`Falha ao verificar identidade do servidor: ${res.stderr}`);
  }
  const [addr, port, db, ver] = res.stdout.split('|');
  if (addr !== '127.0.0.1' || port !== String(PORT) || db !== DB_NAME) {
    throw new Error(`ABORTADO: Identidade inesperada: addr=${addr}, port=${port}, db=${db}`);
  }
  return { addr, port: Number(port), db, version: ver };
}

export class InteractivePsqlSession {
  constructor(name) {
    this.name = name;
    this.proc = null;
    this.pid = null;
    this.stdoutBuf = '';
    this.stderrBuf = '';
    this.seq = 0;
    this.pending = null;
  }

  async connect() {
    this.proc = spawn(PSQL_EXE, [
      '-h', HOST,
      '-p', String(PORT),
      '-U', 'postgres',
      '-d', DB_NAME,
      '-X',
      '-n',
      '-A',
      '-t',
      '-q',
      '-v', 'ON_ERROR_STOP=0',
      '-v', 'VERBOSITY=verbose'
    ], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.proc.stdout.on('data', chunk => {
      this.stdoutBuf += chunk.toString();
      this._checkSentinel();
    });
    this.proc.stderr.on('data', chunk => {
      this.stderrBuf += chunk.toString();
    });
    this.proc.on('exit', code => {
      if (this.pending) {
        const rej = this.pending.reject;
        this.pending = null;
        rej(new Error(`Sessão ${this.name} encerrou inesperadamente (code=${code})`));
      }
    });

    const pidRes = await this.exec('SELECT pg_backend_pid();');
    this.pid = Number(pidRes.stdout.trim());
    return this.pid;
  }

  _checkSentinel() {
    if (!this.pending) return;
    const marker = this.pending.marker;
    const idx = this.stdoutBuf.indexOf(marker);
    if (idx !== -1) {
      const out = this.stdoutBuf.slice(0, idx).trim();
      this.stdoutBuf = this.stdoutBuf.slice(idx + marker.length).replace(/^\r?\n/, '');
      const err = this.stderrBuf.trim();
      this.stderrBuf = '';
      if (this.pending.timer) clearTimeout(this.pending.timer);
      const resolve = this.pending.resolve;
      this.pending = null;
      const sqlstateMatch = err.match(/^(?:ERROR|ERRO):\s+([0-9A-Z]{5}):/m);
      resolve({
        stdout: out,
        stderr: err,
        sqlstate: sqlstateMatch ? sqlstateMatch[1] : null,
        hasError: Boolean(sqlstateMatch || /^(?:ERROR|ERRO):/m.test(err))
      });
    }
  }

  exec(sql, timeoutMs = 15000) {
    if (this.pending) {
      return Promise.reject(new Error(`Sessão ${this.name} já possui comando pendente`));
    }
    this.seq += 1;
    const marker = `__VEXOR_DONE_${this.name}_${this.seq}__`;
    this.stderrBuf = '';
    return new Promise((resolve, reject) => {
      const timer = timeoutMs > 0 ? setTimeout(() => {
        if (this.pending && this.pending.marker === marker) {
          this.pending = null;
          reject(new Error(`Timeout (${timeoutMs}ms) na sessão ${this.name} executando: ${sql.slice(0, 100)}`));
        }
      }, timeoutMs) : null;
      this.pending = { marker, resolve, reject, timer };
      this.proc.stdin.write(`${sql}\n\\echo ${marker}\n`);
    });
  }

  async safeRollback() {
    if (this.pending && this.pending.timer) {
      clearTimeout(this.pending.timer);
      this.pending = null;
    }
    try {
      await this.exec('ROLLBACK;', 2000);
    } catch {
      // ignore during cleanup
    }
  }

  async close() {
    if (this.pending && this.pending.timer) {
      clearTimeout(this.pending.timer);
      this.pending = null;
    }
    if (!this.proc) return;
    try {
      this.proc.stdin.write('\\q\n');
      this.proc.stdin.end();
    } catch {
      // ignore
    }
    await new Promise(r => setTimeout(r, 150));
    if (!this.proc.killed) {
      try { this.proc.kill(); } catch { /* ignore */ }
    }
  }
}

export async function waitUntilBlocked(observer, targetPid, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await observer.exec(
      `SELECT pid || '|' || coalesce(wait_event_type,'') || '|' || coalesce(wait_event,'') || '|' || coalesce(pg_blocking_pids(pid)::text,'{}') || '|' || left(query, 120) FROM pg_stat_activity WHERE pid = ${targetPid};`
    );
    const line = res.stdout.trim();
    if (line.includes('|Lock|')) {
      return line;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return null;
}
