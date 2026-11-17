// Test suite for Admin Panel Etapa 5 — Central de Auditoria & Segurança
// Run with: node scripts/test-admin-etapa5.mjs

import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcRoot = path.join(rootDir, "src");

const MOCK_NEXT_LINK = `data:text/javascript,${encodeURIComponent(`
import React from ${JSON.stringify(import.meta.resolve("react"))};
export default function Link({ href, children, ...props }) {
  return React.createElement("a", { href: typeof href === "string" ? href : String(href), ...props }, children);
}
`)}`;

const MOCK_NEXT_NAVIGATION = `data:text/javascript,${encodeURIComponent(`
export function usePathname() { return "/admin/audit"; }
export function redirect(url) { throw new Error("NEXT_REDIRECT:" + url); }
`)}`;

const MOCK_AUTH_STORE = `data:text/javascript,${encodeURIComponent(`
export const DEMO_PROFILES = [];
const state = {
  user: {
    id: "00000000-0000-0000-0000-000000000004",
    username: "vexor_admin",
    displayName: "Vexor Administrator",
    role: "admin",
    isSuspended: false,
    preferredLanguage: "pt-BR",
  },
  isAdmin: true,
  isModerator: true,
  isLoading: false,
  signOut: async () => {},
};
export function useAuthStore(selector) {
  return typeof selector === "function" ? selector(state) : state;
}
`)}`;

const MOCK_I18N_CONTEXT = `data:text/javascript,${encodeURIComponent(`
import { getDictionary } from ${JSON.stringify(pathToFileURL(path.join(srcRoot, "lib/i18n/dictionaries.ts")).href)};
export function useI18n() {
  const locale = globalThis.__VEXOR_TEST_LOCALE__ || "pt-BR";
  return {
    locale,
    dict: getDictionary(locale),
    setLocale: () => {},
  };
}
`)}`;

function resolveTsPath(candidate) {
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return pathToFileURL(candidate).href;
  }
  for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
    if (fs.existsSync(candidate + ext)) {
      return pathToFileURL(candidate + ext).href;
    }
  }
  for (const indexFile of ["index.ts", "index.tsx", "index.js"]) {
    const joined = path.join(candidate, indexFile);
    if (fs.existsSync(joined)) {
      return pathToFileURL(joined).href;
    }
  }
  return candidate;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/link") return { url: MOCK_NEXT_LINK, shortCircuit: true };
    if (specifier === "next/navigation") return { url: MOCK_NEXT_NAVIGATION, shortCircuit: true };
    if (specifier === "@/features/auth/use-auth-store") return { url: MOCK_AUTH_STORE, shortCircuit: true };
    if (specifier === "@/lib/i18n/context") return { url: MOCK_I18N_CONTEXT, shortCircuit: true };

    let mapped = specifier;
    if (specifier.startsWith("@/")) {
      mapped = resolveTsPath(path.join(srcRoot, specifier.slice(2)));
    } else if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith("file:") &&
      !context.parentURL.includes("node_modules")
    ) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      mapped = resolveTsPath(path.resolve(parentDir, specifier));
    }
    return nextResolve(mapped, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && url.endsWith(".tsx")) {
      const filePath = fileURLToPath(url);
      const source = fs.readFileSync(filePath, "utf8");
      const transpiled = ts.transpileModule(source, {
        fileName: filePath,
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      });
      return { format: "module", source: transpiled.outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

console.log("==================================================");
console.log("   VEXOR - TESTE AUTOMATIZADO ETAPA 5 ADMIN       ");
console.log("   (Central de Auditoria, Segurança & Exportação) ");
console.log("==================================================");

// 1. Arquivos obrigatórios, isolamento, server-side authz e schema SQL
console.log(">>> [1/7] Verificando arquivos, autorização server-side e integridade SQL...");

const REQUIRED_FILES = [
  "src/features/admin/utils/audit-export.ts",
  "src/features/admin/components/admin-audit-detail-modal.tsx",
  "src/app/admin/audit/page.tsx",
  "src/app/admin/audit/layout.tsx",
];

for (const file of REQUIRED_FILES) {
  const fullPath = path.join(rootDir, file);
  assert.ok(fs.existsSync(fullPath), `Arquivo obrigatório ausente: ${file}`);
  const content = fs.readFileSync(fullPath, "utf8");
  assert.ok(content.length > 100, `Arquivo vazio: ${file}`);
}

const auditPageSrc = fs.readFileSync(path.join(rootDir, "src/app/admin/audit/page.tsx"), "utf8");
const auditModalSrc = fs.readFileSync(path.join(rootDir, "src/features/admin/components/admin-audit-detail-modal.tsx"), "utf8");

for (const src of [auditPageSrc, auditModalSrc]) {
  assert.ok(!src.includes("SIMULATED_AUDIT_LOGS"), "Acesso direto a SIMULATED_AUDIT_LOGS detectado!");
  assert.ok(!src.includes("adminService"), "Referência legada a adminService detectada!");
  assert.ok(!src.includes("service_role"), "Referência a service_role detectada!");
  assert.ok(!/\.(insert|update|upsert|delete|rpc)\s*\(/.test(src), "Operação de escrita Supabase detectada!");
  assert.ok(!src.includes("dangerouslySetInnerHTML"), "Renderização HTML insegura detectada!");
}

const layoutSrc = fs.readFileSync(path.join(rootDir, "src/app/admin/audit/layout.tsx"), "utf8");
assert.ok(layoutSrc.includes('requireServerAuthorization("admin")'), "Autorização server-side ausente!");

const schemaSql = fs.readFileSync(path.join(rootDir, "supabase/migrations/20261110000001_schema.sql"), "utf8");
const trigSql = fs.readFileSync(path.join(rootDir, "supabase/migrations/20261110000002_functions_triggers.sql"), "utf8");
const rlsSql = fs.readFileSync(path.join(rootDir, "supabase/migrations/20261110000003_rls_and_grants.sql"), "utf8");
assert.ok(schemaSql.includes("create table public.audit_logs"));
assert.ok(trigSql.includes("create function public.audit_logs_block_mutation()"));
assert.ok(rlsSql.includes("create policy audit_logs_select_admin on public.audit_logs"));

const headerSrc = fs.readFileSync(path.join(rootDir, "src/components/layout/header.tsx"), "utf8");
const footerSrc = fs.readFileSync(path.join(rootDir, "src/components/layout/footer.tsx"), "utf8");
assert.ok(!headerSrc.includes('href="/admin/audit"'));
assert.ok(!footerSrc.includes('href="/admin/audit"'));
console.log("  ✓ Arquivos, autorização server-side, isolamento e migrações SQL íntegros.\n");

// Import real provider, export utils, and React SSR
const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const { createSimulatedAdminProvider } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/services/admin-provider.ts")).href
);
const {
  sanitizeAuditMetadata,
  escapeCsvCell,
  generateAuditLogsCsv,
  classifyAuditSeverity,
} = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/utils/audit-export.ts")).href
);
const { default: AdminAuditPage } = await import(
  pathToFileURL(path.join(srcRoot, "app/admin/audit/page.tsx")).href
);
const { AdminAuditDetailModal } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/components/admin-audit-detail-modal.tsx")).href
);

// 2. Sanitização de metadados & omissão de dados privados
console.log(">>> [2/7] Testando sanitização de metadados e omissão de dados privados...");
const circular = { note: "ok" };
circular.self = circular;
const sanitized = sanitizeAuditMetadata({
  email: "admin@vexor.sec",
  password: "secret",
  refresh_token: "rt_123",
  access_token: "at_123",
  apiKey: "ak_live",
  service_role: "sr_secret",
  jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.sig",
  authHeader: "Bearer abcdef",
  nested: { cookie: "sid=1", safeField: "TLS_1_3" },
  circular,
});
assert.equal(sanitized.email, "[REDACTED_FOR_SECURITY]");
assert.equal(sanitized.password, "[REDACTED_FOR_SECURITY]");
assert.equal(sanitized.refresh_token, "[REDACTED_FOR_SECURITY]");
assert.equal(sanitized.access_token, "[REDACTED_FOR_SECURITY]");
assert.equal(sanitized.apiKey, "[REDACTED_FOR_SECURITY]");
assert.equal(sanitized.service_role, "[REDACTED_FOR_SECURITY]");
assert.equal(sanitized.jwt, "[REDACTED_FOR_SECURITY]");
assert.equal(sanitized.authHeader, "[REDACTED_FOR_SECURITY]");
assert.equal(sanitized.nested.cookie, "[REDACTED_FOR_SECURITY]");
assert.equal(sanitized.nested.safeField, "TLS_1_3");
assert.equal(sanitized.circular.self._circular, "[TRUNCATED]");
console.log("  ✓ Sanitização e tratamento de metadados malformados/circulares validados.\n");

// 3. Proteção CSV Formula Injection & RFC 4180
console.log(">>> [3/7] Testando proteção contra CSV Formula Injection e caracteres especiais...");
const payloads = [
  "=cmd|' /C calc'!A0",
  "+1+1",
  "-2+3",
  "@SUM(1+1)",
  "\t=1+1",
  "\r=1+1",
  "\n=1+1",
  "   =HYPERLINK(\"http://evil.com\",\"Click\")",
  " \t +cmd|' /C whoami'!A0",
  "\u0000=1+1",
];
for (const p of payloads) {
  const escaped = escapeCsvCell(p);
  assert.ok(escaped.startsWith("\"'"), `Payload não neutralizado: ${JSON.stringify(p)} -> ${escaped}`);
}
assert.equal(escapeCsvCell('Texto com "aspas", vírgula e\nquebra'), '"Texto com ""aspas"", vírgula e\nquebra"');
assert.equal(escapeCsvCell(null), '""');
assert.equal(escapeCsvCell(undefined), '""');

const csvWithAccents = generateAuditLogsCsv([
  {
    id: 99,
    actorId: "u-1",
    actorUsername: "operador_ação",
    action: "user.role_changed",
    entityType: "profile",
    entityId: "u-2",
    metadata: { from: "member", to: "moderator", email: "hidden@vexor.sec" },
    createdAt: "2026-11-15T10:00:00Z",
  },
]);
assert.ok(csvWithAccents.startsWith("\uFEFF"));
assert.ok(csvWithAccents.includes("operador_ação"));
assert.ok(!csvWithAccents.includes("hidden@vexor.sec"));
console.log("  ✓ CSV Formula Injection (incluindo espaços/controle/LF) e UTF-8 BOM validados.\n");

// 4. Serviço de Auditoria: resumo, filtros, busca, ordenação, paginação, exportação
console.log(">>> [4/7] Testando serviço de auditoria (filtros, pesquisa, ordenação, paginação e resumo)...");
const provider = createSimulatedAdminProvider();
const summary = await provider.audit.getAuditSummary();
assert.equal(summary.isSimulatedDemoData, true);
assert.ok(summary.totalEvents >= 10);
assert.ok(summary.criticalEvents >= 1);
assert.ok(summary.adminChanges >= 1);
assert.ok(summary.accessDeniedEvents >= 1);
assert.ok(summary.recentEvents >= 1);

// Filtro por operador
const byActor = await provider.audit.listAuditEntries({ actorUsername: "mod_sentinel" });
assert.ok(byActor.total >= 1);
assert.equal(byActor.items.every((e) => e.actorUsername.includes("mod_sentinel")), true);

// Filtro por ação
const byAction = await provider.audit.listAuditEntries({ action: "user.role_changed" });
assert.ok(byAction.total >= 1);
assert.equal(byAction.items[0].metadata.from, "member");
assert.equal(byAction.items[0].metadata.to, "moderator");

// Filtro por entidade
const byEntity = await provider.audit.listAuditEntries({ entityType: "system" });
assert.ok(byEntity.total >= 1);
assert.equal(byEntity.items.every((e) => e.entityType === "system"), true);

// Filtro por classificação
const byCritical = await provider.audit.listAuditEntries({ severity: "critical" });
assert.ok(byCritical.total >= 1);
assert.equal(byCritical.items.every((e) => classifyAuditSeverity(e) === "critical"), true);

const byDenied = await provider.audit.listAuditEntries({ severity: "access_denied" });
assert.ok(byDenied.total >= 1);
assert.equal(byDenied.items[0].action, "auth.access_denied");

// Filtro por período
const byToday = await provider.audit.listAuditEntries({ period: "today" });
assert.ok(byToday.total >= 1);

// Combinação de filtros + pesquisa textual + ordenação ascendente + paginação
const combined = await provider.audit.listAuditEntries(
  { actorUsername: "vexor_admin", entityType: "profile", query: "suspended_user" },
  { page: 1, pageSize: 5 }
);
assert.equal(combined.total, 1);
assert.equal(combined.items[0].action, "user.suspended");

const ascList = await provider.audit.listAuditEntries({ sortOrder: "asc" }, { page: 1, pageSize: 5 });
const descList = await provider.audit.listAuditEntries({ sortOrder: "desc" }, { page: 1, pageSize: 5 });
assert.ok(new Date(ascList.items[0].createdAt).getTime() <= new Date(descList.items[0].createdAt).getTime());

// Paginação
const p1 = await provider.audit.listAuditEntries({}, { page: 1, pageSize: 4 });
const p2 = await provider.audit.listAuditEntries({}, { page: 2, pageSize: 4 });
assert.equal(p1.items.length, 4);
assert.notEqual(p1.items[0].id, p2.items[0].id);

// Lista vazia
const emptyRes = await provider.audit.listAuditEntries({ query: "termo_inexistente_xyz_999" });
assert.equal(emptyRes.total, 0);
assert.equal(emptyRes.items.length, 0);

// Consulta individual & exportação filtrada
const single = await provider.audit.getAuditEntryById(3);
assert.ok(single);
assert.equal(single.action, "user.role_changed");
const exportedFiltered = await provider.audit.exportFilteredEntries({ severity: "access_denied" });
assert.equal(exportedFiltered.length, byDenied.total);
const exportedCsv = generateAuditLogsCsv(exportedFiltered);
assert.ok(exportedCsv.includes("auth.access_denied"));
console.log("  ✓ Serviço de auditoria, filtros combináveis, ordenação, paginação e exportação validados.\n");

// 5. SSR PT-BR e EN + imutabilidade na UI (sem editar/excluir)
console.log(">>> [5/7] Testando SSR em PT-BR e EN, comparação from/to e ausência de edição/exclusão...");
for (const locale of ["pt-BR", "en"]) {
  globalThis.__VEXOR_TEST_LOCALE__ = locale;
  const pageHtml = renderToStaticMarkup(React.createElement(AdminAuditPage));
  const detailHtml = renderToStaticMarkup(
    React.createElement(AdminAuditDetailModal, {
      log: single,
      onClose: () => {},
    })
  );

  if (locale === "pt-BR") {
    assert.ok(pageHtml.includes("Central de Auditoria de Segurança"));
    assert.ok(pageHtml.includes("Exportar CSV"));
    assert.ok(detailHtml.includes("Detalhes do Evento de Auditoria"));
    assert.ok(detailHtml.includes("Valor Anterior:"));
    assert.ok(detailHtml.includes("Valor Posterior:"));
  } else {
    assert.ok(pageHtml.includes("Security Audit Center"));
    assert.ok(pageHtml.includes("Export CSV"));
    assert.ok(detailHtml.includes("Audit Event Details"));
    assert.ok(detailHtml.includes("Previous Value:"));
    assert.ok(detailHtml.includes("New Value:"));
  }
  assert.ok(detailHtml.includes("member"));
  assert.ok(detailHtml.includes("moderator"));
  assert.ok(!pageHtml.includes("Excluir evento"));
  assert.ok(!pageHtml.includes("Delete event"));
}
console.log("  ✓ SSR PT-BR/EN, comparação from/to e UI somente leitura validados.\n");

// 6. Verificação de chaves i18n
console.log(">>> [6/7] Verificando chaves obrigatórias no dicionário i18n...");
const dictContent = fs.readFileSync(path.join(rootDir, "src/lib/i18n/dictionaries.ts"), "utf8");
for (const key of [
  "auditPage:",
  "Central de Auditoria de Segurança",
  "Security Audit Center",
  "exportCsvBtn:",
  "immutableNotice:",
  "severityLabels:",
  "previousValueLabel:",
  "nextValueLabel:",
]) {
  assert.ok(dictContent.includes(key), `Chave i18n ausente: ${key}`);
}
console.log("  ✓ Dicionários PT-BR e EN completos.\n");

// 7. Responsividade estrutural
console.log(">>> [7/7] Verificando classes responsivas estruturais...");
assert.ok(auditPageSrc.includes("hidden overflow-x-auto md:block"));
assert.ok(auditPageSrc.includes("md:hidden"));
assert.ok(auditPageSrc.includes("min-h-[38px]"));
console.log("  ✓ Responsividade desktop/mobile validada.\n");

console.log("==================================================");
console.log("   TODOS OS TESTES DA ETAPA 5 FORAM APROVADOS!   ");
console.log("==================================================");
