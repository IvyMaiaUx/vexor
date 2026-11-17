import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcRoot = path.join(rootDir, "src");

registerHooks({
  resolve(specifier, context, nextResolve) {
    let mapped = specifier;
    if (specifier.startsWith("@/")) {
      const candidate = path.join(srcRoot, specifier.slice(2));
      if (fs.existsSync(candidate + ".ts")) {
        mapped = pathToFileURL(candidate + ".ts").href;
      } else if (fs.existsSync(candidate + ".tsx")) {
        mapped = pathToFileURL(candidate + ".tsx").href;
      } else if (fs.existsSync(path.join(candidate, "index.ts"))) {
        mapped = pathToFileURL(path.join(candidate, "index.ts")).href;
      }
    } else if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !path.extname(specifier) &&
      context.parentURL?.startsWith("file:")
    ) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const candidate = path.resolve(parentDir, specifier);
      if (fs.existsSync(candidate + ".ts")) {
        mapped = pathToFileURL(candidate + ".ts").href;
      } else if (fs.existsSync(candidate + ".tsx")) {
        mapped = pathToFileURL(candidate + ".tsx").href;
      } else if (fs.existsSync(path.join(candidate, "index.ts"))) {
        mapped = pathToFileURL(path.join(candidate, "index.ts")).href;
      }
    }
    return nextResolve(mapped, context);
  },
});

const { createSimulatedAdminProvider } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/services/admin-provider.ts")).href
);

function makeActor({ id, username, role, isSuspended = false }) {
  return {
    id,
    username,
    displayName: username,
    bio: "",
    role,
    isSuspended,
    interests: [],
    reputationPoints: 100,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

console.log("=== VEXOR ETAPA 1 MODULAR ADMIN LAYER TEST SUITE ===");

const provider = createSimulatedAdminProvider();
assert.equal(provider.isSimulated, true, "Provider must explicitly mark simulated mode");

// 1. Dashboard stats
const stats = await provider.dashboard.getDashboardStats();
assert.equal(stats.isSimulatedDemoData, true);
assert.ok(stats.totalUsers > 0);
assert.equal(stats.activeUsers + stats.suspendedUsers, stats.totalUsers);
assert.ok(stats.recentAuditActionsCount >= 0);

// 2. Users listing, pagination, filters, and non-exposure of private email
const page1 = await provider.users.listUsers({}, { page: 1, pageSize: 2 });
assert.equal(page1.isSimulatedDemoData, true);
assert.equal(page1.page, 1);
assert.equal(page1.pageSize, 2);
assert.ok(page1.items.length <= 2);
assert.ok(page1.total >= page1.items.length);
for (const u of page1.items) {
  assert.equal("email" in u, false, "AdminUser must never expose private email");
  assert.notEqual(u.role, "root_admin", "root_admin role must never exist");
}

const targetUser = page1.items.find((u) => u.role === "member") ?? page1.items[0];
assert.ok(targetUser, "Expected at least one simulated user");
const fetchedById = await provider.users.getUserById(targetUser.id);
assert.equal(fetchedById?.id, targetUser.id);

// 3. RBAC & Integrity on users service
const memberActor = makeActor({ id: "actor-member", username: "member_actor", role: "member" });
const modActor = makeActor({ id: "actor-mod", username: "mod_actor", role: "moderator" });
const suspendedAdmin = makeActor({
  id: "actor-susp-admin",
  username: "susp_admin",
  role: "admin",
  isSuspended: true,
});

const adminList = await provider.users.listUsers({ role: "admin", status: "active" });
const adminTarget = adminList.items[0];
assert.ok(adminTarget, "Expected an active simulated admin user");
const adminActor = makeActor({
  id: adminTarget.id,
  username: adminTarget.username,
  role: "admin",
});

const memberRoleAttempt = await provider.users.updateUserRole(memberActor, targetUser.id, "moderator");
assert.equal(memberRoleAttempt.success, false);
assert.match(memberRoleAttempt.error ?? "", /42501/);

const modRoleAttempt = await provider.users.updateUserRole(modActor, targetUser.id, "moderator");
assert.equal(modRoleAttempt.success, false);
assert.match(modRoleAttempt.error ?? "", /42501/);

const suspAdminRoleAttempt = await provider.users.updateUserRole(suspendedAdmin, targetUser.id, "moderator");
assert.equal(suspAdminRoleAttempt.success, false);
assert.match(suspAdminRoleAttempt.error ?? "", /42501/);

const selfDemote = await provider.users.updateUserRole(adminActor, adminActor.id, "member");
assert.equal(selfDemote.success, false);

const selfSuspend = await provider.users.updateUserSuspension(adminActor, adminActor.id, true, "Teste");
assert.equal(selfSuspend.success, false);

const suspendNoReason = await provider.users.updateUserSuspension(adminActor, targetUser.id, true, "");
assert.equal(suspendNoReason.success, false);

const validRoleUpdate = await provider.users.updateUserRole(adminActor, targetUser.id, "moderator");
assert.equal(validRoleUpdate.success, true);
const updatedTarget = await provider.users.getUserById(targetUser.id);
assert.equal(updatedTarget?.role, "moderator");

const validSuspend = await provider.users.updateUserSuspension(
  adminActor,
  targetUser.id,
  true,
  "Violação de política de laboratório"
);
assert.equal(validSuspend.success, true);
assert.equal((await provider.users.getUserById(targetUser.id))?.isSuspended, true);

// 4. Moderation queue
const queuePage = await provider.moderation.listQueue({}, { page: 1, pageSize: 5 });
assert.equal(queuePage.isSimulatedDemoData, true);
assert.ok(queuePage.items.length > 0);
const queueItem = queuePage.items[0];

const memberModAttempt = await provider.moderation.executeAction(
  memberActor,
  { id: queueItem.id, contentType: queueItem.contentType },
  "hide",
  "spam"
);
assert.equal(memberModAttempt.success, false);
assert.match(memberModAttempt.error ?? "", /42501/);

const modAction = await provider.moderation.executeAction(
  modActor,
  { id: queueItem.id, contentType: queueItem.contentType },
  "hide",
  "Conteúdo fora de escopo"
);
assert.equal(modAction.success, true);

// 5. Reports
const reportsPage = await provider.reports.listReports({ status: "open" }, { page: 1, pageSize: 5 });
assert.equal(reportsPage.isSimulatedDemoData, true);
assert.ok(reportsPage.items.length > 0);
const reportItem = reportsPage.items[0];

const memberReportAttempt = await provider.reports.resolveReport(memberActor, reportItem.id, "resolved", "ok");
assert.equal(memberReportAttempt.success, false);
assert.match(memberReportAttempt.error ?? "", /42501/);

const modReportResolve = await provider.reports.resolveReport(
  modActor,
  reportItem.id,
  "resolved",
  "Revisado pela moderação"
);
assert.equal(modReportResolve.success, true);

// 6. Resources
const resourcesPage = await provider.resources.listResources({}, { page: 1, pageSize: 5 });
assert.equal(resourcesPage.isSimulatedDemoData, true);
assert.ok(resourcesPage.items.length > 0);
const resourceItem = resourcesPage.items[0];

const rejectWithoutReason = await provider.resources.moderateResource(modActor, resourceItem.id, "rejected", "");
assert.equal(rejectWithoutReason.success, false);

const rejectWithReason = await provider.resources.moderateResource(
  modActor,
  resourceItem.id,
  "rejected",
  "Link inválido ou sem documentação"
);
assert.equal(rejectWithReason.success, true);

// 7. Audit entries generated by the mutations above
const auditResult = await provider.audit.listAuditEntries({}, { page: 1, pageSize: 10 });
assert.equal(auditResult.isSimulatedDemoData, true);
assert.ok(auditResult.total >= 5, "Expected audit entries for admin/moderation mutations");

// 8. Static check: zero localStorage or root_admin in new Etapa 1 modular files
const modularFiles = [
  "src/features/admin/data/simulated-admin-data.ts",
  "src/features/admin/services/shared.ts",
  "src/features/admin/services/dashboard-service.ts",
  "src/features/admin/services/users-service.ts",
  "src/features/admin/services/moderation-service.ts",
  "src/features/admin/services/reports-service.ts",
  "src/features/admin/services/resources-service.ts",
  "src/features/admin/services/audit-service.ts",
  "src/features/admin/services/admin-provider.ts",
];

for (const relPath of modularFiles) {
  const raw = fs.readFileSync(path.join(rootDir, relPath), "utf8");
  const withoutComments = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.equal(/\blocalStorage\b/.test(withoutComments), false, `${relPath} must not use localStorage`);
  assert.equal(/\broot_admin\b/.test(withoutComments), false, `${relPath} must not reference root_admin`);
}

console.log("ALL ETAPA 1 MODULAR ADMIN LAYER CHECKS PASSED.");
