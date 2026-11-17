// Test suite for Admin Panel Etapa 6 — Moderação de Conteúdo
// Run with: node scripts/test-admin-etapa6.mjs

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
export function usePathname() { return "/admin/moderation"; }
export function useSearchParams() { return new URLSearchParams("type=resource"); }
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
      const source = fs.readFileSync(fileURLToPath(url), "utf8");
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
        fileName: fileURLToPath(url),
      });
      return { format: "module", source: transpiled.outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const { createSimulatedAdminProvider } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/services/admin-provider.ts")).href
);
const { getModerationAvailableActions } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/services/moderation-service.ts")).href
);
const { analyzeUrlSafety } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/utils/url-safety.ts")).href
);
const AdminModerationPage = (
  await import(pathToFileURL(path.join(srcRoot, "app/admin/moderation/page.tsx")).href)
).default;
const { AdminModerationDetailModal } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/components/admin-moderation-detail-modal.tsx")).href
);
const { AdminModerationDecisionModal } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/components/admin-moderation-decision-modal.tsx")).href
);

console.log("==================================================");
console.log("   VEXOR - TESTE AUTOMATIZADO ETAPA 6 ADMIN       ");
console.log("   (Moderação de Conteúdo, Denúncias & URL Safety)");
console.log("==================================================");

const ADMIN_ACTOR = {
  id: "00000000-0000-0000-0000-000000000004",
  username: "vexor_admin",
  displayName: "Vexor Admin",
  role: "admin",
  isSuspended: false,
  preferredLanguage: "pt-BR",
  interests: [],
  createdAt: "2026-11-01T00:00:00Z",
};

const MOD_ACTOR = {
  ...ADMIN_ACTOR,
  id: "00000000-0000-0000-0000-000000000003",
  username: "mod_sentinel",
  displayName: "Mod Sentinel",
  role: "moderator",
};

const MEMBER_ACTOR = {
  ...ADMIN_ACTOR,
  id: "00000000-0000-0000-0000-000000000001",
  username: "sec_analyst_br",
  role: "member",
};

const SUSPENDED_MOD = {
  ...MOD_ACTOR,
  isSuspended: true,
};

// 1. Arquivos obrigatórios, proteção de rota e integridade SQL
console.log(">>> [1/8] Verificando arquivos, proteção server-side, XSS e SQL...");

const REQUIRED_FILES = [
  "src/features/admin/utils/url-safety.ts",
  "src/features/admin/services/moderation-service.ts",
  "src/features/admin/services/reports-service.ts",
  "src/features/admin/components/admin-moderation-decision-modal.tsx",
  "src/features/admin/components/admin-moderation-detail-modal.tsx",
  "src/features/admin/components/admin-report-modal.tsx",
  "src/app/admin/moderation/page.tsx",
];

for (const file of REQUIRED_FILES) {
  assert.ok(fs.existsSync(file), `Arquivo ausente: ${file}`);
  const content = fs.readFileSync(file, "utf8");
  assert.ok(!content.includes("dangerouslySetInnerHTML"), `Uso proibido de dangerouslySetInnerHTML em ${file}`);
  assert.ok(!content.includes("service_role"), `Uso proibido de service_role em ${file}`);
}

const adminLayout = fs.readFileSync("src/app/admin/layout.tsx", "utf8");
assert.ok(adminLayout.includes('requireServerAuthorization("moderator")'), "Proteção server-side ausente em /admin/layout.tsx");

const moderationPageSource = fs.readFileSync("src/app/admin/moderation/page.tsx", "utf8");
assert.ok(moderationPageSource.includes("adminDataProvider"), "Página deve usar adminDataProvider");
assert.ok(!moderationPageSource.includes("SIMULATED_MODERATION_QUEUE"), "UI não deve acessar array simulado diretamente");
assert.ok(moderationPageSource.includes('searchParams?.get("type")'), "Compatibilidade com ?type= ausente");

const schemaSql = fs.readFileSync("supabase/migrations/20261110000001_schema.sql", "utf8");
const trigSql = fs.readFileSync("supabase/migrations/20261110000002_functions_triggers.sql", "utf8");
const rlsSql = fs.readFileSync("supabase/migrations/20261110000003_rls_and_grants.sql", "utf8");
assert.ok(/create type public\.resource_status\s+as enum\s*\('pending',\s*'approved',\s*'rejected',\s*'archived'\);/i.test(schemaSql));
assert.ok(trigSql.includes("create function public.resubmit_resource(p_resource_id uuid)"));
assert.ok(rlsSql.includes("create policy resources_update_moderator on public.resources"));

console.log("  ✓ Arquivos, proteção server-side, isolamento e migrações SQL íntegros.\n");

// 2. Inspeção defensiva de URLs (analyzeUrlSafety)
console.log(">>> [2/8] Testando analisador defensivo de URLs (analyzeUrlSafety)...");

const safeUrl = analyzeUrlSafety("https://github.com/SigmaHQ/sigma");
assert.equal(safeUrl.isSafe, true);
assert.equal(safeUrl.severity, "safe");
assert.equal(safeUrl.warnings.length, 0);

for (const dangerousUrl of [
  "javascript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "  javascript:alert(document.cookie)",
]) {
  const rep = analyzeUrlSafety(dangerousUrl);
  assert.equal(rep.isSafe, false, `Deveria bloquear ${dangerousUrl}`);
  assert.equal(rep.severity, "danger");
}

const punyRep = analyzeUrlSafety("https://xn--pple-43d.com/login");
assert.equal(punyRep.isSafe, false);
assert.equal(punyRep.severity, "danger");
assert.ok(punyRep.indicators?.includes("punycode"));

const shortRep = analyzeUrlSafety("https://bit.ly/hidden-dest");
assert.equal(shortRep.severity, "warning");
assert.ok(shortRep.indicators?.includes("url_shortener"));

const c2Rep = analyzeUrlSafety("http://198.51.100.42:4444/payload");
assert.equal(c2Rep.severity, "warning");
assert.ok(c2Rep.indicators?.includes("direct_ip"));
assert.ok(c2Rep.indicators?.includes("suspicious_port"));

const userinfoRep = analyzeUrlSafety("https://github.com@evil-login.example/auth");
assert.equal(userinfoRep.isSafe, false);
assert.ok(userinfoRep.indicators?.includes("userinfo_spoofing"));

const redirectRep = analyzeUrlSafety("https://example.com/go?next=https://evil.example/phish");
assert.equal(redirectRep.severity, "warning");
assert.ok(redirectRep.indicators?.includes("suspicious_redirect"));

const phishRep = analyzeUrlSafety("https://login.verify.account.example.tk/signin");
assert.equal(phishRep.severity, "warning");
assert.ok(phishRep.indicators?.includes("phishing_heuristic"));

console.log("  ✓ Inspeção de URLs aprovada (protocolos perigosos, Punycode, encurtadores, C2, userinfo, redirects, phishing).\n");

// 3. Fila unificada, separação de tipos, filtros combinados e busca textual
console.log(">>> [3/8] Testando fila unificada, 4 tipos, filtros combináveis e busca textual...");

const provider = createSimulatedAdminProvider();
const allQueue = await provider.moderation.listQueue({}, { page: 1, pageSize: 50 });
assert.ok(allQueue.items.length >= 8, "Fila unificada deve conter itens demonstrativos");

const typesPresent = new Set(allQueue.items.map((i) => i.contentType));
assert.deepEqual(
  Array.from(typesPresent).sort(),
  ["post", "research", "resource", "topic"],
  "Fila deve separar corretamente resource, topic, post e research"
);

const filteredCombo = await provider.moderation.listQueue({
  contentType: "resource",
  status: "pending",
  hasReports: "yes",
  query: "encurtado",
});
assert.equal(filteredCombo.items.length, 1);
assert.equal(filteredCombo.items[0].id, "mod-demo-res-002");

const byAuthor = await provider.moderation.listQueue({ author: "dfir_marina" });
assert.ok(byAuthor.items.every((i) => i.authorUsername.includes("dfir_marina")));

console.log("  ✓ Fila unificada, 4 tipos de conteúdo, filtros combináveis e busca validados.\n");

// 4. Aprovação, rejeição com justificativa (>= 5 chars), ações incompatíveis, conflitos (409) e histórico/auditoria
console.log(">>> [4/8] Testando ações de moderação, justificativa, conflito 409, RBAC e auditoria...");

const memberDeny = await provider.moderation.executeAction(
  MEMBER_ACTOR,
  { id: "mod-demo-res-001", contentType: "resource" },
  "approve"
);
assert.equal(memberDeny.success, false);
assert.equal(memberDeny.statusCode, 403);
assert.ok(memberDeny.error?.includes("42501"));

const suspDeny = await provider.moderation.executeAction(
  SUSPENDED_MOD,
  { id: "mod-demo-res-001", contentType: "resource" },
  "approve"
);
assert.equal(suspDeny.success, false);
assert.equal(suspDeny.statusCode, 403);

const shortReject = await provider.moderation.executeAction(
  MOD_ACTOR,
  { id: "mod-demo-res-001", contentType: "resource" },
  "reject",
  "abcd"
);
assert.equal(shortReject.success, false);
assert.equal(shortReject.statusCode, 400);
assert.ok(shortReject.error?.includes("22023"));

const invalidRestore = await provider.moderation.executeAction(
  MOD_ACTOR,
  { id: "mod-demo-res-001", contentType: "resource" },
  "restore"
);
assert.equal(invalidRestore.success, false);
assert.equal(invalidRestore.statusCode, 409);

const approveOk = await provider.moderation.executeAction(
  MOD_ACTOR,
  { id: "mod-demo-res-001", contentType: "resource" },
  "approve",
  "Regras Sigma verificadas."
);
assert.equal(approveOk.success, true);

const duplicateApprove = await provider.moderation.executeAction(
  MOD_ACTOR,
  { id: "mod-demo-res-001", contentType: "resource" },
  "approve"
);
assert.equal(duplicateApprove.success, false);
assert.equal(duplicateApprove.statusCode, 409);

const rejectOk = await provider.moderation.executeAction(
  ADMIN_ACTOR,
  { id: "mod-demo-research-001", contentType: "research" },
  "reject",
  "Necessita revisão adicional de referências CVE."
);
assert.equal(rejectOk.success, true);

const updatedResearch = await provider.moderation.getItemById?.(
  "mod-demo-research-001",
  "research"
);
assert.ok(updatedResearch);
assert.equal(updatedResearch.status, "rejected");
assert.ok((updatedResearch.moderationHistory?.length ?? 0) >= 1);
assert.equal(updatedResearch.moderationHistory?.[0].fromStatus, "pending");
assert.equal(updatedResearch.moderationHistory?.[0].toStatus, "rejected");

const auditRes = await provider.audit.listAuditEntries({
  entityId: "mod-demo-research-001",
});
assert.ok(auditRes.items.length >= 1);
assert.equal(auditRes.items[0].action, "research.reject");
assert.equal(auditRes.items[0].metadata.from, "pending");
assert.equal(auditRes.items[0].metadata.to, "rejected");

assert.deepEqual(
  getModerationAvailableActions({ contentType: "post", status: "deleted" }),
  []
);
assert.ok(
  getModerationAvailableActions({ contentType: "post", status: "hidden" }).includes("restore")
);

console.log("  ✓ Ações, justificativas, conflito 409, RBAC, histórico e auditoria validados.\n");

// 5. Denúncias e privacidade de denunciantes
console.log(">>> [5/8] Testando serviço de denúncias, conflitos e privacidade...");

const reportsList = await provider.reports.listReports({});
assert.ok(reportsList.items.length >= 3);
for (const rep of reportsList.items) {
  assert.equal(rep.reporterId, null, "reporterId deve permanecer nulo na listagem de moderação");
  assert.equal(rep.reporterUsername, "protected_reporter", "reporterUsername deve ser mascarado");
}

const repShortNote = await provider.reports.resolveReport(MOD_ACTOR, "rep-demo-0001", "resolved", "ok");
assert.equal(repShortNote.success, false);
assert.equal(repShortNote.statusCode, 400);

const repOk = await provider.reports.resolveReport(
  MOD_ACTOR,
  "rep-demo-0001",
  "reviewing",
  "Denúncia encaminhada para verificação de escopo."
);
assert.equal(repOk.success, true);

const repDup = await provider.reports.resolveReport(
  MOD_ACTOR,
  "rep-demo-0001",
  "reviewing",
  "Tentativa duplicada de mesmo status."
);
assert.equal(repDup.success, false);
assert.equal(repDup.statusCode, 409);

console.log("  ✓ Denúncias, histórico, conflitos e sigilo do denunciante validados.\n");

// 6. SSR em PT-BR e EN (página e modais)
console.log(">>> [6/8] Testando renderização SSR em PT-BR e EN...");

globalThis.__VEXOR_TEST_LOCALE__ = "pt-BR";
const htmlPagePt = renderToStaticMarkup(React.createElement(AdminModerationPage));
assert.ok(htmlPagePt.includes("Central de Moderação") || htmlPagePt.includes("Carregando"));

const sampleItem = allQueue.items[0];
const htmlDetailPt = renderToStaticMarkup(
  React.createElement(AdminModerationDetailModal, {
    item: sampleItem,
    onClose: () => {},
    onOpenDecision: () => {},
    canModerate: true,
  })
);
assert.ok(htmlDetailPt.includes(sampleItem.title));
assert.ok(htmlDetailPt.includes("Inspeção Defensiva"));

globalThis.__VEXOR_TEST_LOCALE__ = "en";
const htmlPageEn = renderToStaticMarkup(React.createElement(AdminModerationPage));
assert.ok(htmlPageEn.includes("Content Moderation Center") || htmlPageEn.includes("Carregando"));

const htmlDetailEn = renderToStaticMarkup(
  React.createElement(AdminModerationDetailModal, {
    item: sampleItem,
    onClose: () => {},
    onOpenDecision: () => {},
    canModerate: true,
  })
);
assert.ok(htmlDetailEn.includes("Defensive External Link Inspection"));

const htmlDecisionEn = renderToStaticMarkup(
  React.createElement(AdminModerationDecisionModal, {
    item: sampleItem,
    mode: "reject",
    onClose: () => {},
    onConfirm: async () => ({ success: true }),
  })
);
assert.ok(htmlDecisionEn.includes("Reject Content with Justification"));

console.log("  ✓ Renderização SSR em PT-BR e EN validada.\n");

// 7. Dicionários i18n e isolamento da navegação pública
console.log(">>> [7/8] Verificando dicionários i18n e isolamento da navegação pública...");

const dictContent = fs.readFileSync("src/lib/i18n/dictionaries.ts", "utf8");
assert.ok(dictContent.includes('title: "Central de Moderação de Conteúdo"'));
assert.ok(dictContent.includes('title: "Content Moderation Center"'));
assert.ok(dictContent.includes("conflictError:"));
assert.ok(dictContent.includes("reporterProtected:"));

const headerContent = fs.readFileSync("src/components/layout/header.tsx", "utf8");
const footerContent = fs.readFileSync("src/components/layout/footer.tsx", "utf8");
assert.ok(!headerContent.includes('"/admin') && !headerContent.includes("'/admin"));
assert.ok(!footerContent.includes('"/admin') && !footerContent.includes("'/admin"));

console.log("  ✓ Dicionários PT-BR/EN e isolamento público validados.\n");

// 8. Responsividade estrutural e estados de carregamento/erro
console.log(">>> [8/8] Verificando classes responsivas estruturais e estados de UI...");

assert.ok(moderationPageSource.includes("hidden lg:block"), "Tabela desktop responsiva ausente");
assert.ok(moderationPageSource.includes("lg:hidden"), "Cards mobile responsivos ausentes");
assert.ok(moderationPageSource.includes("loadError"), "Estado de erro de carregamento ausente");
assert.ok(moderationPageSource.includes("loading"), "Estado de carregamento ausente");

console.log("  ✓ Responsividade estrutural e estados de loading/erro validados.\n");

console.log("==================================================");
console.log("   TODOS OS TESTES DA ETAPA 6 PASSARAM COM SUCESSO! ");
console.log("==================================================");
