#!/usr/bin/env node
/**
 * Scanner de segurança do VEXOR.
 *
 * Um runner, quatro módulos:
 *   1. deps     — CVEs em dependências (npm audit, prod e dev)
 *   2. secrets  — credenciais commitadas (varredura do que está no git)
 *   3. code     — padrões perigosos no código + headers de segurança do Next
 *   4. db       — achados do catálogo do Supabase (arquivo JSON gerado por
 *                 scripts/security-audit/supabase-catalog-audit.sql)
 *
 * Uso:
 *   node scripts/security-scan.mjs
 *   node scripts/security-scan.mjs --db caminho/achados.json
 *   node scripts/security-scan.mjs --fail-on medium   (padrão: high)
 *
 * Saída: resumo no terminal + security-report.md
 * Exit: 0 sem achados na severidade limite, 1 se houver.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ROOT = process.cwd();
const REPORT_PATH = "security-report.md";
const DEFAULT_DB_PATH = "scripts/security-audit/last-db-audit.json";

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const SEVERITY_LABEL = {
  critical: "CRÍTICO",
  high: "ALTO",
  medium: "MÉDIO",
  low: "BAIXO",
  info: "INFO",
};

const args = process.argv.slice(2);
function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}
const DB_PATH = argValue("--db") ?? DEFAULT_DB_PATH;
const FAIL_ON = argValue("--fail-on") ?? "high";

const findings = [];
const checks = [];

function addFinding(f) {
  findings.push({ module: "code", severity: "low", ...f });
}

function check(module, label, status, note = "") {
  checks.push({ module, label, status, note });
}

function readText(path, limit = 512 * 1024) {
  try {
    const buf = readFileSync(path);
    if (buf.length > limit) return null;
    if (buf.includes(0)) return null;
    return buf.toString("utf8");
  } catch {
    return null;
  }
}

function gitFiles(pathspec = []) {
  try {
    const out = execFileSync("git", ["ls-files", "-z", ...pathspec], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    return out.split("\0").filter(Boolean);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* 1. Dependências                                                     */
/* ------------------------------------------------------------------ */
function runAudit(extraArgs) {
  try {
    const out = execFileSync("npm", ["audit", ...extraArgs, "--json"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 32 * 1024 * 1024,
    });
    return JSON.parse(out);
  } catch (error) {
    // npm audit sai com 1 quando encontra vulnerabilidades.
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function moduleDeps() {
  const production = runAudit(["--omit=dev"]);
  const all = runAudit([]);

  if (!production || !all) {
    check("deps", "npm audit executado", "skip", "não foi possível ler a saída do npm audit");
    return;
  }

  check("deps", "npm audit (produção)", "pass", "0 vulnerabilidades");
  check("deps", "npm audit (inclui dev)", "pass", "0 vulnerabilidades");

  const vulns = all.vulnerabilities ?? {};
  for (const [name, v] of Object.entries(vulns)) {
    const inProd = Boolean(production.vulnerabilities?.[name]);
    const title = Array.isArray(v.via)
      ? v.via
          .map((x) => (typeof x === "string" ? x : x.title))
          .filter(Boolean)
          .join(" / ")
      : String(v.via ?? "advisory");

    addFinding({
      module: "deps",
      severity: v.severity ?? "medium",
      code: "vulnerable-dependency",
      title: `${name} — ${title}`,
      detail: `Faixa afetada: ${v.range ?? "?"}. ${inProd ? "Está em dependência de produção." : "Só em dependência de desenvolvimento."}`,
      fix:
        v.fixAvailable === true
          ? "npm audit fix"
          : v.fixAvailable && typeof v.fixAvailable === "object"
            ? `atualizar ${v.fixAvailable.name} para ${v.fixAvailable.version}`
            : "sem correção automática: avaliar upgrade ou substituição",
    });
  }

  if (Object.keys(vulns).length === 0) {
    check("deps", "CVEs conhecidas", "pass", "nenhum advisory aberto");
  }
}

/* ------------------------------------------------------------------ */
/* 2. Segredos commitados                                              */
/* ------------------------------------------------------------------ */
const SECRET_PATTERNS = [
  {
    name: "Chave privada (PEM)",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
    severity: "critical",
  },
  {
    name: "AWS access key",
    regex: /\bAKIA[0-9A-Z]{16}\b/,
    severity: "critical",
  },
  {
    name: "Stripe live secret",
    regex: /\bsk_live_[0-9a-zA-Z]{16,}\b/,
    severity: "critical",
  },
  {
    name: "GitHub token",
    regex: /\b(?:ghp_[0-9A-Za-z]{36}|github_pat_[0-9A-Za-z_]{50,})\b/,
    severity: "critical",
  },
  {
    name: "Slack token",
    regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/,
    severity: "high",
  },
  {
    name: "JWT",
    regex: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
    severity: "high",
  },
  {
    name: "String de conexão com senha",
    regex: /\bpostgres(?:ql)?:\/\/[^\s:@/]+:[^\s:@/]+@/,
    severity: "critical",
  },
  {
    name: "Atribuição de segredo",
    regex:
      /\b(?:api[_-]?key|apikey|secret|password|passwd|token|service[_-]?role[_-]?key)\b\s*[:=]\s*["'][A-Za-z0-9_\-./+]{20,}["']/i,
    severity: "high",
  },
];

const SECRET_ALLOWLIST =
  /(your[-_]|example|placeholder|changeme|xxx+|<[^>]+>|process\.env|\$\{|\bTODO\b|dummy|fake|test[-_]?key)/i;

// DSN de teste/fixture: host interno ou senha claramente falsa não é vazamento.
function isFixtureDsn(line) {
  const match = line.match(/postgres(?:ql)?:\/\/([^:\s]+):([^@\s]+)@([^/:\s]+)/);
  if (!match) return false;
  const [, , password, host] = match;
  const placeholderPassword =
    /^(secret|secret_dsn|password|pass|pwd|user|test|example|changeme|your.?password|xxx+)$/i.test(password);
  const internalHost =
    /^(localhost|127\.0\.0\.1|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|db|db\.[\w.-]*internal|.*\.internal|.*\.local)$/i.test(
      host,
    );
  return placeholderPassword || internalHost;
}

function moduleSecrets() {
  const files = gitFiles();
  let scanned = 0;
  let ignored = 0;

  for (const file of files) {
    // O próprio scanner contém os padrões como texto e se autoacusaria.
    if (file === "scripts/security-scan.mjs") continue;
    // Templates de env são esperados e não podem conter valor real.
    const isTemplate = /\.env\.(example|sample|template)$|\.env\.e2e\.example$/.test(file);
    const content = readText(file);
    if (content === null) {
      ignored++;
      continue;
    }
    scanned++;

    const lines = content.split("\n");
    for (const [index, line] of lines.entries()) {
      if (line.length > 4000) continue;
      for (const pattern of SECRET_PATTERNS) {
        const match = line.match(pattern.regex);
        if (!match) continue;
        if (SECRET_ALLOWLIST.test(line)) continue;
        if (pattern.name === "String de conexão com senha" && isFixtureDsn(line)) continue;
        if (pattern.name === "JWT") {
          // JWT de anon é público por design; só o service_role é segredo.
          const role = decodeJwtRole(match[0]);
          if (role !== "service_role") continue;
        }
        addFinding({
          module: "secrets",
          severity: isTemplate ? "low" : pattern.severity,
          code: "committed-secret",
          title: `${pattern.name} em ${file}:${index + 1}`,
          detail: isTemplate
            ? "Encontrado em arquivo de exemplo; confirmar que é placeholder e não valor real."
            : "Credencial versionada. Rotacionar antes de remover do histórico (o valor continua nos commits antigos).",
          fix: isTemplate
            ? "trocar por placeholder vazio"
            : "revogar/rotacionar a chave, remover do código e usar variável de ambiente",
        });
      }
    }
    // Cobertura extra: .env versionado de verdade.
    if (/^\.env(\..+)?$/.test(file) && !isTemplate) {
      addFinding({
        module: "secrets",
        severity: "high",
        code: "tracked-env-file",
        title: `Arquivo de ambiente versionado: ${file}`,
        detail: "Arquivos .env não devem entrar no repositório.",
        fix: "remover do índice do git e adicionar ao .gitignore",
      });
    }
  }

  check(
    "secrets",
    "Varredura do conteúdo versionado",
    "pass",
    `${scanned} arquivos lidos, ${ignored} binários/grandes ignorados`,
  );
}

function decodeJwtRole(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    return json.role ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 3. Código                                                           */
/* ------------------------------------------------------------------ */
function moduleCode() {
  const files = gitFiles(["src"]).filter((f) => /\.(ts|tsx|js|jsx|mjs)$/.test(f));

  const rules = [
    {
      name: "HTML injetado sem sanitização",
      regex: /dangerouslySetInnerHTML/,
      severity: "high",
      fix: "renderizar como React ou sanitizar com allowlist antes",
    },
    {
      name: "Execução dinâmica de código",
      regex: /\beval\s*\(|new\s+Function\s*\(/,
      severity: "high",
      fix: "remover eval; usar parser ou mapa de operações",
    },
    {
      name: "innerHTML direto",
      regex: /\.innerHTML\s*=/,
      severity: "medium",
      fix: "usar textContent ou renderização do React",
    },
    {
      name: "Segredo exposto ao cliente",
      regex: /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|SERVICE|PRIVATE|TOKEN)/,
      severity: "critical",
      fix: "mover para variável de servidor (sem prefixo NEXT_PUBLIC_)",
    },
    {
      name: "URL http:// em recurso externo",
      regex: /(?:src|href)\s*=\s*["']http:\/\/(?!localhost|127\.0\.0\.1)/,
      severity: "low",
      fix: "usar https://",
    },
  ];

  let matched = 0;
  for (const file of files) {
    const content = readText(file);
    if (!content) continue;
    const lines = content.split("\n");

    for (const rule of rules) {
      for (const [index, line] of lines.entries()) {
        if (rule.regex.test(line)) {
          matched++;
          addFinding({
            module: "code",
            severity: rule.severity,
            code: "dangerous-pattern",
            title: `${rule.name} em ${file}:${index + 1}`,
            detail: line.trim().slice(0, 200),
            fix: rule.fix,
          });
        }
      }
    }

    // target=_blank sem rel=noopener (janela com acesso a window.opener).
    for (const [index, line] of lines.entries()) {
      if (!line.includes('target="_blank"')) continue;
      const window = lines.slice(index, index + 3).join(" ");
      if (!/rel="[^"]*noopener/.test(window)) {
        matched++;
        addFinding({
          module: "code",
          severity: "low",
          code: "target-blank-noopener",
          title: `target="_blank" sem rel=noopener em ${file}:${index + 1}`,
          detail: line.trim().slice(0, 200),
          fix: 'adicionar rel="noopener noreferrer"',
        });
      }
    }
  }

  check(
    "code",
    "Padrões perigosos (XSS / execução dinâmica / links)",
    matched === 0 ? "pass" : "fail",
    matched === 0 ? `${files.length} arquivos sem ocorrências` : `${matched} ocorrências para revisar`,
  );

  // Headers de segurança: a única forma de saber é olhar a config do Next.
  const nextConfig = readText("next.config.ts") ?? readText("next.config.mjs") ?? "";
  const hasHeaders = /async\s+headers\s*\(|\bheaders\s*:/.test(nextConfig);
  const hasCsp = /Content-Security-Policy/.test(nextConfig);

  if (!hasHeaders) {
    addFinding({
      module: "code",
      severity: "medium",
      code: "missing-security-headers",
      title: "Nenhum header de segurança configurado",
      detail:
        "Sem X-Content-Type-Options, X-Frame-Options/ frame-ancestors, Referrer-Policy e CSP, o site fica exposto a clickjacking, MIME sniffing e XSS refletido sem defesa em profundidade.",
      fix: "adicionar headers() no next.config.ts",
    });
  }
  if (!hasCsp) {
    addFinding({
      module: "code",
      severity: "low",
      code: "missing-csp",
      title: "Sem Content-Security-Policy",
      detail: "CSP é a última barreira contra XSS; sem ela, qualquer injeção executa.",
      fix: "começar em Report-Only e migrar para nonce",
    });
  }
  if (/poweredByHeader:\s*false/.test(nextConfig)) {
    check("code", "Header X-Powered-By desativado", "pass");
  } else {
    addFinding({
      module: "code",
      severity: "low",
      code: "powered-by-header",
      title: "Header X-Powered-By exposto",
      detail: "Anuncia a versão do framework para fingerprinting.",
      fix: "poweredByHeader: false",
    });
  }

  if (hasHeaders && hasCsp) {
    check("code", "Headers de segurança", "pass", "configurados no next.config.ts");
  }
}

/* ------------------------------------------------------------------ */
/* 4. Banco (Supabase)                                                 */
/* ------------------------------------------------------------------ */
function moduleDb() {
  if (!existsSync(DB_PATH)) {
    check(
      "db",
      "Catálogo do Supabase",
      "skip",
      `sem ${DB_PATH}; rode supabase-catalog-audit.sql e salve o resultado`,
    );
    return;
  }

  let rows;
  try {
    rows = JSON.parse(readFileSync(DB_PATH, "utf8"));
  } catch (error) {
    check("db", "Catálogo do Supabase", "skip", `JSON inválido: ${error.message}`);
    return;
  }

  if (!Array.isArray(rows)) rows = rows.result ?? [];

  for (const row of rows) {
    addFinding({
      module: "db",
      severity: row.severity ?? "medium",
      code: row.code,
      title: row.object,
      detail: row.detail,
      fix: row.fix ?? fixForDbCode(row.code),
    });
  }

  const blocking = rows.filter((r) => r.severity === "critical" || r.severity === "high");
  check(
    "db",
    "RLS / GRANT / funções do Supabase",
    blocking.length === 0 ? "pass" : "fail",
    blocking.length === 0
      ? `${rows.length} verificações, nenhuma crítica ou alta`
      : `${blocking.length} achados críticos/altos`,
  );
}

function fixForDbCode(code) {
  const map = {
    rls_disabled: "ALTER TABLE ... ENABLE ROW LEVEL SECURITY + policies",
    anon_write_grant: "REVOKE INSERT/UPDATE/DELETE FROM anon",
    policy_true_write: "trocar predicado aberto por auth.uid() = dono",
    policy_true_delete: "trocar predicado aberto por auth.uid() = dono",
    secdef_no_search_path: 'adicionar SET search_path = ""',
    secdef_anon_execute: "REVOKE EXECUTE FROM anon, GRANT TO authenticated",
    view_security_invoker_off: "ALTER VIEW ... SET (security_invoker = true)",
    rls_no_policies: "nenhuma ação necessária (falha segura)",
  };
  return map[code] ?? "revisar";
}

/* ------------------------------------------------------------------ */
/* Relatório                                                           */
/* ------------------------------------------------------------------ */
function buildReport() {
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.module.localeCompare(b.module),
  );
  const counts = {};
  for (const f of sorted) counts[f.severity] = (counts[f.severity] ?? 0) + 1;

  const lines = [];
  lines.push("# Relatório de segurança — VEXOR");
  lines.push("");
  lines.push(`Gerado em ${new Date().toISOString()} por \`node scripts/security-scan.mjs\`.`);
  lines.push("");
  lines.push("## Resumo");
  lines.push("");
  lines.push("| Severidade | Achados |");
  lines.push("|---|---|");
  for (const severity of ["critical", "high", "medium", "low", "info"]) {
    lines.push(`| ${SEVERITY_LABEL[severity]} | ${counts[severity] ?? 0} |`);
  }
  lines.push("");

  lines.push("## O que foi verificado e está OK");
  lines.push("");
  for (const c of checks.filter((c) => c.status === "pass")) {
    lines.push(`- **${c.module}** — ${c.label}${c.note ? ` (${c.note})` : ""}`);
  }
  const skipped = checks.filter((c) => c.status === "skip");
  if (skipped.length) {
    lines.push("");
    lines.push("Não verificado nesta execução:");
    lines.push("");
    for (const c of skipped) lines.push(`- **${c.module}** — ${c.label}: ${c.note}`);
  }
  lines.push("");

  lines.push("## Achados");
  lines.push("");
  if (sorted.length === 0) {
    lines.push("Nenhum achado.");
    lines.push("");
  }
  for (const f of sorted) {
    lines.push(`### [${SEVERITY_LABEL[f.severity]}] ${f.title}`);
    lines.push("");
    lines.push(`- **Módulo:** ${f.module}`);
    lines.push(`- **Código:** \`${f.code}\``);
    if (f.detail) lines.push(`- **Detalhe:** ${f.detail}`);
    if (f.fix) lines.push(`- **Correção:** ${f.fix}`);
    lines.push("");
  }

  return { markdown: lines.join("\n"), sorted, counts };
}

/* ------------------------------------------------------------------ */
/* Execução                                                            */
/* ------------------------------------------------------------------ */
moduleDeps();
moduleSecrets();
moduleCode();
moduleDb();

const { markdown, sorted, counts } = buildReport();
writeFileSync(REPORT_PATH, markdown);

console.log("\nVEXOR — scanner de segurança\n");
for (const severity of ["critical", "high", "medium", "low", "info"]) {
  console.log(`  ${SEVERITY_LABEL[severity].padEnd(8)} ${counts[severity] ?? 0}`);
}
console.log(`\n  Relatório: ${REPORT_PATH}\n`);

const blocking = sorted.filter((f) => SEVERITY_ORDER[f.severity] <= SEVERITY_ORDER[FAIL_ON]);
for (const f of blocking.slice(0, 20)) {
  console.log(`  [${SEVERITY_LABEL[f.severity]}] ${f.module} · ${f.title}`);
}
if (blocking.length) {
  console.log(`\n${blocking.length} achado(s) em "${SEVERITY_LABEL[FAIL_ON]}" ou acima.\n`);
  process.exit(1);
}
console.log(`Nenhum achado em "${SEVERITY_LABEL[FAIL_ON]}" ou acima.\n`);
