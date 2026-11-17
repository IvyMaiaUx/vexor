// Test suite for Admin Panel Etapa 4 — Gestão de Usuários e Controle de Acesso
// Run with: node scripts/test-admin-etapa4.mjs

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
export function usePathname() { return "/admin/users"; }
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
    if (specifier === "next/link") {
      return { url: MOCK_NEXT_LINK, shortCircuit: true };
    }
    if (specifier === "next/navigation") {
      return { url: MOCK_NEXT_NAVIGATION, shortCircuit: true };
    }
    if (specifier === "@/features/auth/use-auth-store") {
      return { url: MOCK_AUTH_STORE, shortCircuit: true };
    }
    if (specifier === "@/lib/i18n/context") {
      return { url: MOCK_I18N_CONTEXT, shortCircuit: true };
    }

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
      return {
        format: "module",
        source: transpiled.outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

console.log("==================================================");
console.log("   VEXOR - TESTE AUTOMATIZADO ETAPA 4 ADMIN       ");
console.log("   (Gestão de Usuários & Controle de Acesso RBAC) ");
console.log("==================================================");
console.log("[METODOLOGIA & ESCOPO DO TESTE]:");
console.log("  • Execução: Offline em Node (camada simulada createSimulatedAdminProvider + SSR).");
console.log("  • Limitação RLS: Códigos '42501'/'22023' são emitidos pelo serviço simulado local.");
console.log("  • Nenhuma operação de escrita remota no Supabase é executada.\n");

// 1. Verificação de Arquivos Obrigatórios e Isolamento
console.log(">>> [1/7] Verificando arquivos obrigatórios, schema SQL e isolamento...");

const REQUIRED_FILES = [
  "src/features/admin/components/admin-user-detail-modal.tsx",
  "src/features/admin/components/admin-user-role-modal.tsx",
  "src/features/admin/components/admin-user-suspension-modal.tsx",
  "src/app/admin/users/page.tsx",
];

for (const file of REQUIRED_FILES) {
  const fullPath = path.join(rootDir, file);
  assert.ok(fs.existsSync(fullPath), `Arquivo obrigatório ausente: ${file}`);
  const content = fs.readFileSync(fullPath, "utf8");
  assert.ok(content.length > 200, `Arquivo parece incompleto: ${file}`);
  assert.ok(
    !content.includes("SIMULATED_ADMIN_USERS") &&
      !content.includes("SIMULATED_AUDIT_LOGS"),
    `Componente acessa array demonstrativo diretamente: ${file}`
  );
  assert.ok(
    !content.includes("adminService"),
    `Componente ainda referencia adminService legado: ${file}`
  );
  assert.ok(
    !content.includes("service_role") &&
      !/\.(insert|update|upsert|delete|rpc)\s*\(/.test(content),
    `Operação de escrita Supabase detectada indevidamente em: ${file}`
  );
}

const layoutContent = fs.readFileSync(
  path.join(rootDir, "src/app/admin/users/layout.tsx"),
  "utf8"
);
assert.ok(
  layoutContent.includes('requireServerAuthorization("admin")'),
  "Autorização server-side ausente em src/app/admin/users/layout.tsx"
);

const schemaSql = fs.readFileSync(
  path.join(rootDir, "supabase/migrations/20261110000001_schema.sql"),
  "utf8"
);
assert.ok(
  /create type public\.user_role\s+as enum\s*\('member',\s*'moderator',\s*'admin'\);/i.test(
    schemaSql
  ),
  "ENUM public.user_role foi alterado!"
);

const headerContent = fs.readFileSync(
  path.join(rootDir, "src/components/layout/header.tsx"),
  "utf8"
);
assert.ok(!headerContent.includes('href="/admin"'), "Link público /admin no Header!");
const footerContent = fs.readFileSync(
  path.join(rootDir, "src/components/layout/footer.tsx"),
  "utf8"
);
assert.ok(!footerContent.includes('href="/admin"'), "Link público /admin no Footer!");

console.log("  ✓ Arquivos, isolamento de dados, server-side authz e schema SQL íntegros.\n");

// Import real simulated provider & React SSR
const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const { createSimulatedAdminProvider } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/services/admin-provider.ts")).href
);
const { default: AdminUsersPage } = await import(
  pathToFileURL(path.join(srcRoot, "app/admin/users/page.tsx")).href
);
const { AdminUserDetailModal } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/components/admin-user-detail-modal.tsx")).href
);
const { AdminUserRoleModal } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/components/admin-user-role-modal.tsx")).href
);
const { AdminUserSuspensionModal } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/components/admin-user-suspension-modal.tsx")).href
);

const provider = createSimulatedAdminProvider();

const adminActor = {
  id: "00000000-0000-0000-0000-000000000004",
  username: "vexor_admin",
  displayName: "Vexor Administrator",
  role: "admin",
  isSuspended: false,
  preferredLanguage: "pt-BR",
  interests: [],
  createdAt: "2026-10-01T08:00:00Z",
};

const modActor = {
  id: "00000000-0000-0000-0000-000000000003",
  username: "mod_sentinel",
  displayName: "Sentinel Moderator",
  role: "moderator",
  isSuspended: false,
  preferredLanguage: "pt-BR",
  interests: [],
  createdAt: "2026-10-05T09:00:00Z",
};

// 2. Listagem, busca, filtros, paginação e detalhes (sem regressão da Etapa 3)
console.log(">>> [2/7] Testando listagem, detalhes, busca, filtros e paginação...");
const initialList = await provider.users.listUsers({}, { page: 1, pageSize: 5 });
assert.ok(initialList.total >= 8);
assert.equal(initialList.items.length, 5);

const filtered = await provider.users.listUsers({
  role: "member",
  status: "active",
  query: "Ana Paula",
});
assert.equal(filtered.total, 1);
assert.equal(filtered.items[0].username, "sec_analyst_br");

const detailUser = await provider.users.getUserById("00000000-0000-0000-0000-000000000001");
assert.ok(detailUser);
assert.equal(detailUser.username, "sec_analyst_br");
console.log("  ✓ Listagem, busca, filtros, paginação e detalhes preservados.\n");

// 3. Regras de Alteração de Papel (RBAC)
console.log(">>> [3/7] Testando alteração de papel e proteções (42501 / último admin)...");

const initialAuditSnapshot = await provider.audit.listAuditEntries({}, { page: 1, pageSize: 50 });
const initialAuditCount = initialAuditSnapshot.total;
const oldestLogBefore = initialAuditSnapshot.items[initialAuditSnapshot.items.length - 1];

// 3.1 Moderator tentando alterar papel -> 42501
const modRoleAttempt = await provider.users.updateUserRole(
  modActor,
  "00000000-0000-0000-0000-000000000001",
  "moderator"
);
assert.equal(modRoleAttempt.success, false);
assert.ok(modRoleAttempt.error?.includes("42501"));

// 3.2 Admin tentando rebaixar a própria conta -> 42501
const selfDemoteAttempt = await provider.users.updateUserRole(
  adminActor,
  adminActor.id,
  "member"
);
assert.equal(selfDemoteAttempt.success, false);
assert.ok(selfDemoteAttempt.error?.includes("42501"));

// 3.3 Último administrador ativo não pode ser rebaixado (mesmo por outro ator hipotético admin)
const secondAdminActor = { ...adminActor, id: "00000000-0000-0000-0000-000000000099", username: "alt_admin" };
const lastAdminDemote = await provider.users.updateUserRole(
  secondAdminActor,
  adminActor.id,
  "moderator"
);
assert.equal(lastAdminDemote.success, false);
assert.ok(lastAdminDemote.error?.includes("42501"));

// 3.4 Admin promovendo membro para moderator -> sucesso + evento user.role_changed
const promoteMember = await provider.users.updateUserRole(
  adminActor,
  "00000000-0000-0000-0000-000000000001",
  "moderator"
);
assert.equal(promoteMember.success, true);
const updatedMember = await provider.users.getUserById("00000000-0000-0000-0000-000000000001");
assert.equal(updatedMember?.role, "moderator");

const afterRoleAudit = await provider.audit.listAuditEntries(
  { entityType: "profile", entityId: "00000000-0000-0000-0000-000000000001" },
  { page: 1, pageSize: 10 }
);
assert.equal(afterRoleAudit.items[0].action, "user.role_changed");
assert.equal(afterRoleAudit.items[0].metadata.from, "member");
assert.equal(afterRoleAudit.items[0].metadata.to, "moderator");
assert.equal(afterRoleAudit.items[0].metadata.targetUsername, "sec_analyst_br");
assert.equal(afterRoleAudit.items[0].actorUsername, "vexor_admin");

console.log("  ✓ Alteração de papel, bloqueio de moderator/self/último admin e auditoria user.role_changed validados.\n");

// 4. Regras de Suspensão
console.log(">>> [4/7] Testando suspensão, justificativa obrigatória (22023) e proteções...");

// 4.1 Justificativa ausente ou < 5 caracteres -> 22023
const emptyReason = await provider.users.updateUserSuspension(
  adminActor,
  "00000000-0000-0000-0000-000000000002",
  true,
  ""
);
assert.equal(emptyReason.success, false);
assert.ok(emptyReason.error?.includes("22023"));

const shortReason = await provider.users.updateUserSuspension(
  adminActor,
  "00000000-0000-0000-0000-000000000002",
  true,
  "  abcd  "
);
assert.equal(shortReason.success, false);
assert.ok(shortReason.error?.includes("22023"));

// 4.2 Moderator tentando suspender -> 42501
const modSuspend = await provider.users.updateUserSuspension(
  modActor,
  "00000000-0000-0000-0000-000000000002",
  true,
  "Justificativa válida de teste"
);
assert.equal(modSuspend.success, false);
assert.ok(modSuspend.error?.includes("42501"));

// 4.3 Auto-suspensão bloqueada -> 42501
const selfSuspend = await provider.users.updateUserSuspension(
  adminActor,
  adminActor.id,
  true,
  "Tentativa de auto-suspensão"
);
assert.equal(selfSuspend.success, false);
assert.ok(selfSuspend.error?.includes("42501"));

// 4.4 Último administrador ativo não pode ser suspenso -> 42501
const lastAdminSuspend = await provider.users.updateUserSuspension(
  secondAdminActor,
  adminActor.id,
  true,
  "Tentativa contra último admin"
);
assert.equal(lastAdminSuspend.success, false);
assert.ok(lastAdminSuspend.error?.includes("42501"));

// 4.5 Usuário já suspenso não pode ser suspenso novamente -> 22023
const doubleSuspend = await provider.users.updateUserSuspension(
  adminActor,
  "00000000-0000-0000-0000-000000000005",
  true,
  "Usuário já suspenso anteriormente"
);
assert.equal(doubleSuspend.success, false);
assert.ok(doubleSuspend.error?.includes("22023"));

// 4.6 Suspensão válida -> sucesso + user.suspended com justificativa
const validSuspend = await provider.users.updateUserSuspension(
  adminActor,
  "00000000-0000-0000-0000-000000000002",
  true,
  "Violação demonstrativa de diretrizes éticas"
);
assert.equal(validSuspend.success, true);
const suspendedTarget = await provider.users.getUserById("00000000-0000-0000-0000-000000000002");
assert.equal(suspendedTarget?.isSuspended, true);
assert.equal(suspendedTarget?.status, "suspended");

const afterSuspendAudit = await provider.audit.listAuditEntries(
  { entityType: "profile", entityId: "00000000-0000-0000-0000-000000000002" },
  { page: 1, pageSize: 10 }
);
assert.equal(afterSuspendAudit.items[0].action, "user.suspended");
assert.equal(
  afterSuspendAudit.items[0].metadata.reason,
  "Violação demonstrativa de diretrizes éticas"
);

console.log("  ✓ Suspensão, justificativa >= 5 chars, bloqueios e evento user.suspended validados.\n");

// 5. Regras de Reativação & Imutabilidade Append-Only
console.log(">>> [5/7] Testando reativação e imutabilidade append-only do histórico...");

// 5.1 Usuário ativo não pode ser reativado -> 22023
const reactivateActive = await provider.users.updateUserSuspension(
  adminActor,
  "00000000-0000-0000-0000-000000000001",
  false
);
assert.equal(reactivateActive.success, false);
assert.ok(reactivateActive.error?.includes("22023"));

// 5.2 Moderator não pode reativar -> 42501
const modReactivate = await provider.users.updateUserSuspension(
  modActor,
  "00000000-0000-0000-0000-000000000002",
  false
);
assert.equal(modReactivate.success, false);
assert.ok(modReactivate.error?.includes("42501"));

// 5.3 Admin reativando usuário suspenso -> sucesso + user.unsuspended
const validUnsuspend = await provider.users.updateUserSuspension(
  adminActor,
  "00000000-0000-0000-0000-000000000002",
  false
);
assert.equal(validUnsuspend.success, true);
const reactivatedTarget = await provider.users.getUserById("00000000-0000-0000-0000-000000000002");
assert.equal(reactivatedTarget?.isSuspended, false);
assert.equal(reactivatedTarget?.status, "active");

const afterUnsuspendAudit = await provider.audit.listAuditEntries(
  { entityType: "profile", entityId: "00000000-0000-0000-0000-000000000002" },
  { page: 1, pageSize: 10 }
);
assert.equal(afterUnsuspendAudit.items[0].action, "user.unsuspended");
assert.equal(afterUnsuspendAudit.items[0].metadata.targetUsername, "cve_hunter");

// 5.4 Append-only: total cresceu em 3 e evento anterior permanece intacto
const finalAuditSnapshot = await provider.audit.listAuditEntries({}, { page: 1, pageSize: 50 });
assert.equal(finalAuditSnapshot.total, initialAuditCount + 3);
const oldestLogAfter = finalAuditSnapshot.items[finalAuditSnapshot.items.length - 1];
assert.equal(oldestLogAfter.id, oldestLogBefore.id);
assert.equal(oldestLogAfter.action, oldestLogBefore.action);
assert.equal(oldestLogAfter.createdAt, oldestLogBefore.createdAt);

console.log("  ✓ Reativação, evento user.unsuspended e padrão append-only validados.\n");

// 6. SSR dos componentes em PT-BR e EN
console.log(">>> [6/7] Testando renderização SSR de página e modais em PT-BR e EN...");

const sampleTarget = detailUser;
for (const locale of ["pt-BR", "en"]) {
  globalThis.__VEXOR_TEST_LOCALE__ = locale;
  const pageHtml = renderToStaticMarkup(React.createElement(AdminUsersPage));
  const detailHtml = renderToStaticMarkup(
    React.createElement(AdminUserDetailModal, {
      userId: sampleTarget.id,
      currentAdminId: adminActor.id,
      activeAdminsCount: 1,
      onClose: () => {},
      onOpenRoleModal: () => {},
      onOpenSuspensionModal: () => {},
    })
  );
  const roleModalHtml = renderToStaticMarkup(
    React.createElement(AdminUserRoleModal, {
      user: sampleTarget,
      activeAdminsCount: 1,
      onClose: () => {},
      onSuccess: () => {},
    })
  );
  const suspendModalHtml = renderToStaticMarkup(
    React.createElement(AdminUserSuspensionModal, {
      user: sampleTarget,
      activeAdminsCount: 1,
      onClose: () => {},
      onSuccess: () => {},
    })
  );

  if (locale === "pt-BR") {
    assert.ok(pageHtml.includes("Gerenciamento de usuários"));
    assert.ok(pageHtml.includes("Histórico de Alterações de Acesso e Situação"));
    assert.ok(detailHtml.includes("Detalhes do Usuário"));
    assert.ok(roleModalHtml.includes("Alterar Papel do Usuário"));
    assert.ok(suspendModalHtml.includes("Suspender Conta de Usuário"));
  } else {
    assert.ok(pageHtml.includes("User Management"));
    assert.ok(pageHtml.includes("Access &amp; Status Change History"));
    assert.ok(detailHtml.includes("User Details"));
    assert.ok(roleModalHtml.includes("Change User Role"));
    assert.ok(suspendModalHtml.includes("Suspend User Account"));
  }
}

console.log("  ✓ SSR em PT-BR e EN validado para página e todos os modais.\n");

// 7. Compatibilidade de dicionários i18n
console.log(">>> [7/7] Verificando chaves obrigatórias de i18n...");
const dictContent = fs.readFileSync(
  path.join(rootDir, "src/lib/i18n/dictionaries.ts"),
  "utf8"
);
for (const key of [
  "usersPage:",
  "Gestão de Usuários (RBAC)",
  "User Management (RBAC)",
  "suspendBtn:",
  "unsuspendBtn:",
  "user.role_changed",
  "user.suspended",
  "user.unsuspended",
]) {
  assert.ok(dictContent.includes(key), `Chave i18n ausente: ${key}`);
}

console.log("  ✓ Dicionários PT-BR e EN íntegros.\n");
console.log("==================================================");
console.log("   TODOS OS TESTES DA ETAPA 4 FORAM APROVADOS!   ");
console.log("==================================================");
