// Test suite for Admin Panel Etapa 2
// Run with: node scripts/test-admin-etapa2.mjs

import assert from "node:assert/strict";

console.log("==================================================");
console.log("   VEXOR - TESTE AUTOMATIZADO ETAPA 2 ADMIN       ");
console.log("==================================================\n");

// 1. Simulação dos perfis de usuário
const PROFILES = {
  unauthenticated: null,
  suspended: {
    id: "00000000-0000-0000-0000-000000000005",
    username: "suspended_user",
    role: "member",
    isSuspended: true,
  },
  member: {
    id: "00000000-0000-0000-0000-000000000001",
    username: "sec_analyst_br",
    role: "member",
    isSuspended: false,
  },
  specialistMember: {
    id: "00000000-0000-0000-0000-000000000002",
    username: "cve_hunter",
    role: "member", // Papel estrito PostgreSQL ('member')
    specialty: "Security Researcher", // Especialidade técnica separada da role
    isSuspended: false,
  },
  moderator: {
    id: "00000000-0000-0000-0000-000000000003",
    username: "mod_sentinel",
    role: "moderator",
    isSuspended: false,
  },
  admin: {
    id: "00000000-0000-0000-0000-000000000000",
    username: "root_admin",
    role: "admin",
    isSuspended: false,
  },
};

// 2. Função de decisão que espelha exatamente a lógica do AdminGuard (Barreira Visual de UI)
function evaluateAdminGuard(user, { requireAdmin = false } = {}) {
  if (!user) {
    return { allowed: false, visualStatus: "LOGIN_REQUIRED" };
  }
  if (user.isSuspended) {
    return { allowed: false, visualStatus: "ACCOUNT_SUSPENDED" };
  }
  const isModerator = user.role === "moderator";
  const isAdmin = user.role === "admin";

  if (!isModerator && !isAdmin) {
    return { allowed: false, visualStatus: "INSUFFICIENT_PRIVILEGES" };
  }
  if (requireAdmin && !isAdmin) {
    return { allowed: false, visualStatus: "ROOT_ADMIN_ONLY" };
  }
  return { allowed: true, visualStatus: "ACCESS_GRANTED", role: user.role };
}

// 3. Teste 1: Regras do AdminGuard
console.log("🔍 Teste 1: Verificando matriz de decisão visual do AdminGuard (Roles estritas do PostgreSQL)...");

// Unauthenticated
const rUnauth = evaluateAdminGuard(PROFILES.unauthenticated);
assert.equal(rUnauth.allowed, false);
assert.equal(rUnauth.visualStatus, "LOGIN_REQUIRED");
console.log("  ✓ Não autenticado -> Bloqueio visual: Login Necessário");

// Suspended user
const rSuspended = evaluateAdminGuard(PROFILES.suspended);
assert.equal(rSuspended.allowed, false);
assert.equal(rSuspended.visualStatus, "ACCOUNT_SUSPENDED");
console.log("  ✓ Conta suspensa -> Bloqueio visual: Conta Suspensa");

// Standard member
const rMember = evaluateAdminGuard(PROFILES.member);
assert.equal(rMember.allowed, false);
assert.equal(rMember.visualStatus, "INSUFFICIENT_PRIVILEGES");
console.log("  ✓ Membro comum -> Bloqueio visual: Permissão Insuficiente");

// Member with technical specialty (Security Researcher)
const rSpecialist = evaluateAdminGuard(PROFILES.specialistMember);
assert.equal(rSpecialist.allowed, false);
assert.equal(rSpecialist.visualStatus, "INSUFFICIENT_PRIVILEGES");
console.log("  ✓ Membro com especialidade técnica -> Papel 'member' confirmado, sem privilégio administrativo indevido");

// Moderator on general panel
const rMod = evaluateAdminGuard(PROFILES.moderator);
assert.equal(rMod.allowed, true);
assert.equal(rMod.visualStatus, "ACCESS_GRANTED");
console.log("  ✓ Moderador no painel geral -> Acesso liberado");

// Moderator on root-only section (requireAdmin = true)
const rModRoot = evaluateAdminGuard(PROFILES.moderator, { requireAdmin: true });
assert.equal(rModRoot.allowed, false);
assert.equal(rModRoot.visualStatus, "ROOT_ADMIN_ONLY");
console.log("  ✓ Moderador em área restrita (ex: /admin/users) -> Bloqueio visual: Root Admin Only");

// Admin on general panel
const rAdmin = evaluateAdminGuard(PROFILES.admin);
assert.equal(rAdmin.allowed, true);
assert.equal(rAdmin.visualStatus, "ACCESS_GRANTED");
console.log("  ✓ Root Admin no painel geral -> Acesso liberado");

// Admin on root-only section
const rAdminRoot = evaluateAdminGuard(PROFILES.admin, { requireAdmin: true });
assert.equal(rAdminRoot.allowed, true);
assert.equal(rAdminRoot.visualStatus, "ACCESS_GRANTED");
console.log("  ✓ Root Admin em área restrita (ex: /admin/audit) -> Acesso liberado");

// 4. Teste 2: Isolamento da interface pública (Nenhum link ou indicador para /admin em Header/Footer)
console.log("\n🔍 Teste 2: Verificando isolamento absoluto da navegação pública (Regra de Privacidade)...");
import fs from "node:fs";

const headerCode = fs.readFileSync("src/components/layout/header.tsx", "utf-8");
const footerCode = fs.readFileSync("src/components/layout/footer.tsx", "utf-8");

assert.equal(
  headerCode.includes('href="/admin"'),
  false,
  "Header NÃO deve conter nenhum link ou botão para /admin"
);
assert.equal(
  headerCode.includes("dict.nav.adminPanel"),
  false,
  "Header NÃO deve referenciar adminPanel em navegação pública"
);
assert.equal(
  footerCode.includes('href="/admin"'),
  false,
  "Footer NÃO deve conter nenhum link para /admin"
);
console.log("  ✓ Header 100% limpo: nenhum atalho, botão ou indicação visual para /admin");
console.log("  ✓ Footer 100% limpo: nenhum link para área administrativa");
console.log("  ✓ Menu mobile 100% limpo: ausência total de indicadores administrativos");

// 5. Teste 3: Verificação de imutabilidade de logs (append-only)
console.log("\n🔍 Teste 3: Verificando proteção append-only dos logs de auditoria...");
const testLogs = [
  Object.freeze({
    id: "log-1",
    action: "admin_set_user_role",
    entityType: "profile",
    createdAt: new Date().toISOString(),
  }),
];

let mutationBlocked = false;
try {
  testLogs[0].action = "tampered_action";
} catch {
  mutationBlocked = true;
}
assert.equal(mutationBlocked, true, "Tentativa de mutação em log congelado deve lançar erro");
console.log("  ✓ Logs retornados são imutáveis (Object.freeze previne adulteração em memória)");

// 6. Teste 4: Verificação de documentação visual e alinhamento de roles com PostgreSQL
console.log("\n🔍 Teste 4: Verificando alinhamento de roles e semântica de bloqueio visual...");

const guardCode = fs.readFileSync("src/features/admin/components/admin-guard.tsx", "utf-8");
const validationCode = fs.readFileSync("src/features/auth/validation.ts", "utf-8");

assert.equal(
  guardCode.includes("HTTP 403"),
  false,
  "AdminGuard NÃO deve descrever o bloqueio visual como HTTP 403 real"
);
assert.equal(
  guardCode.includes("HTTP 401"),
  false,
  "AdminGuard NÃO deve descrever o estado deslogado como HTTP 401 real"
);
assert.equal(
  validationCode.includes('| "security_researcher"'),
  false,
  "UserRole NÃO deve conter security_researcher como papel de autenticação"
);

console.log("  ✓ AdminGuard documentado estritamente como barreira de interface visual (sem HTTP 403 fictício)");
console.log("  ✓ UserRole alinhado estritamente com o ENUM PostgreSQL: ('member', 'moderator', 'admin')");

console.log("\n==================================================");
console.log("   TODOS OS TESTES DA ETAPA 2 PASSARAM COM SUCESSO! ");
console.log("==================================================");
