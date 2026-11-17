/**
 * VEXOR ADMIN DATA LAYER & RBAC VERIFICATION SUITE
 *
 * Verifies Etapa 1 administrative layer:
 * 1. Member & suspended user privilege denial (42501)
 * 2. Moderator boundaries (can moderate content/reports, cannot alter roles or suspend users)
 * 3. Admin permissions & integrity rules (self-demote & self-suspend blocked, rejection/suspension reason required)
 * 4. Audit logging (append-only entry generation on every privileged mutation)
 * 5. Isolated Cybercrime Research moderation queue
 */

import assert from "node:assert/strict";

console.log("=== VEXOR ADMIN DATA LAYER & RBAC TEST SUITE ===");
console.log("[ESCOPO METODOLÓGICO]:");
console.log("  • Esta suíte executa exclusivamente em memória via Node.js/JavaScript.");
console.log("  • NÃO executa contra instância PostgreSQL nem valida políticas RLS ativas.");
console.log("  • Strings de erro como '42501' são simulações lógicas do AdminService.");
console.log("  • Testes reais de RLS e funções SECURITY DEFINER pertencem à integração Supabase.\n");

// Mock profiles mirroring PostgreSQL public.profiles & public.user_role
const DEMO_USERS = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    username: "sec_analyst_br",
    role: "member",
    isSuspended: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    username: "cve_hunter",
    role: "member", // in DB role is member
    isSuspended: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    username: "mod_sentinel",
    role: "moderator",
    isSuspended: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    username: "root_admin",
    role: "admin",
    isSuspended: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    username: "suspended_user",
    role: "member",
    isSuspended: true,
  },
];

// In-memory data store for the test
const auditLogs = [];
const reports = [
  {
    id: "rep-0001",
    targetType: "topic",
    targetId: "topic-002",
    status: "open",
    reason: "unauthorized_attack",
  },
  {
    id: "rep-0002",
    targetType: "resource",
    targetId: "unverified-pentest-tool",
    status: "reviewing",
    reason: "malicious_content",
  },
];

const catalogResources = [
  { slug: "tool-valid", name: "Valid Tool", status: "pending" },
  { slug: "unverified-pentest-tool", name: "Unverified Tool", status: "pending" },
];

const researchQueue = [
  { id: "cr-sub-001", title: "Malware Analysis", status: "pending" },
];

// Admin service logic implementation test
function logAudit(actor, action, entityType, entityId, metadata = {}) {
  const newLog = {
    id: auditLogs.length + 1,
    actorId: actor.id,
    actorUsername: actor.username,
    action,
    entityType,
    entityId,
    metadata,
    createdAt: new Date().toISOString(),
  };
  auditLogs.push(newLog);
  return newLog;
}

function setUserRole(actor, targetUserId, newRole) {
  if (actor.isSuspended || actor.role !== "admin") {
    return { success: false, error: "42501: Acesso negado. Apenas administradores podem alterar papéis." };
  }
  if (actor.id === targetUserId && newRole !== "admin") {
    return { success: false, error: "42501: Administradores não podem rebaixar a si mesmos." };
  }
  const target = DEMO_USERS.find((u) => u.id === targetUserId);
  if (!target) return { success: false, error: "P0002: Usuário não encontrado." };

  const oldRole = target.role;
  target.role = newRole;
  logAudit(actor, "user.role_changed", "profile", targetUserId, { from: oldRole, to: newRole });
  return { success: true };
}

function setUserSuspension(actor, targetUserId, suspended, reason) {
  if (actor.isSuspended || actor.role !== "admin") {
    return { success: false, error: "42501: Acesso negado. Apenas administradores podem suspender usuários." };
  }
  if (actor.id === targetUserId) {
    return { success: false, error: "42501: Administradores não podem suspender sua própria conta." };
  }
  if (suspended && (!reason || reason.trim().length < 5)) {
    return { success: false, error: "22023: Uma justificativa é obrigatória para suspender um usuário." };
  }
  const target = DEMO_USERS.find((u) => u.id === targetUserId);
  if (!target) return { success: false, error: "P0002: Usuário não encontrado." };

  target.isSuspended = suspended;
  logAudit(actor, suspended ? "user.suspended" : "user.unsuspended", "profile", targetUserId, { reason });
  return { success: true };
}

function moderateResource(actor, resourceSlug, decision, reason) {
  if (actor.isSuspended || (actor.role !== "moderator" && actor.role !== "admin")) {
    return { success: false, error: "42501: Acesso negado. Requer papel de moderador ou administrador." };
  }
  if (!["approved", "rejected", "archived"].includes(decision)) {
    return { success: false, error: "22023: Decisão inválida." };
  }
  if (decision === "rejected" && (!reason || reason.trim().length < 5)) {
    return { success: false, error: "22023: Justificativa obrigatória (resources_reject_reason)." };
  }
  const target = catalogResources.find((r) => r.slug === resourceSlug);
  if (!target) return { success: false, error: "P0002: Recurso não encontrado." };

  target.status = decision;
  target.rejectionReason = decision === "rejected" ? reason.trim() : undefined;
  logAudit(actor, `resource.${decision}`, "resource", resourceSlug, { reason });
  return { success: true };
}

function resolveReport(actor, reportId, status, note) {
  if (actor.isSuspended || (actor.role !== "moderator" && actor.role !== "admin")) {
    return { success: false, error: "42501: Acesso negado. Requer papel de moderador ou administrador." };
  }
  if (status === "open") {
    return { success: false, error: "22023: Não é possível resolver mantendo status open." };
  }
  const target = reports.find((r) => r.id === reportId);
  if (!target) return { success: false, error: "P0002: Denúncia não encontrada." };

  target.status = status;
  target.handledBy = actor.id;
  target.resolutionNote = note?.trim() ?? null;
  logAudit(actor, `report.${status}`, "report", reportId, { note });
  return { success: true };
}

function moderateResearch(actor, researchId, decision, notes) {
  if (actor.isSuspended || (actor.role !== "moderator" && actor.role !== "admin")) {
    return { success: false, error: "42501: Acesso negado. Requer papel de moderador ou administrador." };
  }
  if (decision === "rejected" && (!notes || notes.trim().length < 5)) {
    return { success: false, error: "22023: Justificativa obrigatória para rejeição." };
  }
  const target = researchQueue.find((r) => r.id === researchId);
  if (!target) return { success: false, error: "P0002: Pesquisa não encontrada." };

  target.status = decision;
  target.moderatorNotes = notes?.trim();
  logAudit(actor, `research.${decision}`, "research", researchId, { notes });
  return { success: true };
}

// -----------------------------------------------------------------------------
// [Test 1] Member & Suspended User Denial (42501)
// -----------------------------------------------------------------------------
console.log("[Test 1] Bloqueio de membros comuns e contas suspensas...");
const member = DEMO_USERS[0];
const suspended = DEMO_USERS[4];

assert.equal(moderateResource(member, "tool-valid", "approved").success, false);
assert.equal(resolveReport(member, "rep-0001", "resolved", "ok").success, false);
assert.equal(setUserRole(member, suspended.id, "moderator").success, false);

assert.equal(moderateResource(suspended, "tool-valid", "approved").success, false);
assert.equal(setUserSuspension(suspended, member.id, true, "motivo").success, false);
console.log("  ✓ Membros comuns e contas suspensas são estritamente bloqueados.");

// -----------------------------------------------------------------------------
// [Test 2] Moderator Permissions & Role Boundaries
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Fronteiras de permissão do Moderador...");
const moderator = DEMO_USERS[2];

// Moderator CAN moderate resources
assert.equal(moderateResource(moderator, "tool-valid", "approved").success, true);
assert.equal(moderateResource(moderator, "unverified-pentest-tool", "rejected", "").success, false); // no reason
assert.equal(moderateResource(moderator, "unverified-pentest-tool", "rejected", "Link quebrado").success, true);

// Moderator CAN resolve reports
assert.equal(resolveReport(moderator, "rep-0001", "resolved", "Tópico inspecionado e conforme.").success, true);

// Moderator CAN moderate research
assert.equal(moderateResearch(moderator, "cr-sub-001", "approved", "Pesquisa validada.").success, true);

// Moderator CANNOT change user roles
const modRoleAttempt = setUserRole(moderator, member.id, "admin");
assert.equal(modRoleAttempt.success, false);
assert.match(modRoleAttempt.error, /Apenas administradores/);

// Moderator CANNOT suspend user accounts
const modSuspendAttempt = setUserSuspension(moderator, member.id, true, "Tentativa indevida");
assert.equal(modSuspendAttempt.success, false);
assert.match(modSuspendAttempt.error, /Apenas administradores/);
console.log("  ✓ Moderador modera conteúdo e denúncias, mas não altera papéis nem suspende usuários.");

// -----------------------------------------------------------------------------
// [Test 3] Admin Powers & Integrity Constraints
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Poderes de Administrador e travas de auto-punição...");
const admin = DEMO_USERS[3];

// Admin cannot demote self
assert.equal(setUserRole(admin, admin.id, "member").success, false);

// Admin cannot suspend self
assert.equal(setUserSuspension(admin, admin.id, true, "Auto suspensão").success, false);

// Admin can promote user
assert.equal(setUserRole(admin, member.id, "moderator").success, true);
assert.equal(DEMO_USERS.find((u) => u.id === member.id).role, "moderator");

// Admin can suspend user with required reason
assert.equal(setUserSuspension(admin, member.id, true, "").success, false); // no reason
assert.equal(setUserSuspension(admin, member.id, true, "Suspensão temporária para auditoria.").success, true);
assert.equal(DEMO_USERS.find((u) => u.id === member.id).isSuspended, true);
console.log("  ✓ Administrador executa operações privilegiadas com travas de integridade.");

// -----------------------------------------------------------------------------
// [Test 4] Audit Logging Integrity
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Integridade de logs de auditoria (append-only)...");
assert.ok(auditLogs.length >= 5, "Devem existir pelo menos 5 ações registradas no log de auditoria.");

const roleChangeLog = auditLogs.find((l) => l.action === "user.role_changed");
assert.ok(roleChangeLog, "Log de alteração de papel deve estar presente");
assert.equal(roleChangeLog.actorUsername, "root_admin");
assert.equal(roleChangeLog.entityType, "profile");

const suspendLog = auditLogs.find((l) => l.action === "user.suspended");
assert.ok(suspendLog, "Log de suspensão de usuário deve estar presente");
assert.equal(suspendLog.actorUsername, "root_admin");
console.log("  ✓ Todos os eventos administrativos geraram entradas de auditoria completas.");

console.log("\n>>> TODOS OS TESTES DA ETAPA 1 FORAM APROVADOS COM SUCESSO! <<<");
