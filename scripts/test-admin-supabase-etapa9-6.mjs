import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(process.cwd());

const tsCache = new Map();
function loadTsModule(relPath) {
  const absPath = path.resolve(projectRoot, relPath);
  if (tsCache.has(absPath)) return tsCache.get(absPath).exports;

  const source = fs.readFileSync(absPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: absPath,
  });

  const mod = { exports: {} };
  tsCache.set(absPath, mod);

  const localRequire = (specifier) => {
    if (specifier === "@/lib/supabase/server") {
      return {
        createClient: async () => {
          throw new Error("createClient() should not be called in offline unit test");
        },
      };
    }
    if (specifier.startsWith("@/")) {
      const target = specifier.slice(2);
      const candidates = [
        path.join("src", `${target}.ts`),
        path.join("src", `${target}.tsx`),
        path.join("src", target, "index.ts"),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(path.resolve(projectRoot, candidate))) {
          return loadTsModule(candidate);
        }
      }
    }
    if (specifier.startsWith(".")) {
      const base = path.dirname(absPath);
      const candidates = [
        path.resolve(base, `${specifier}.ts`),
        path.resolve(base, `${specifier}.tsx`),
        path.resolve(base, specifier, "index.ts"),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          return loadTsModule(path.relative(projectRoot, candidate));
        }
      }
    }
    return require(specifier);
  };

  const fn = new Function("exports", "require", "module", "__filename", "__dirname", outputText);
  fn(mod.exports, localRequire, mod, absPath, path.dirname(absPath));
  return mod.exports;
}

const handlers = loadTsModule("src/features/admin/server/admin-server-handlers.ts");
const errorMapper = loadTsModule("src/features/admin/utils/admin-error-mapper.ts");
const adminProviderMod = loadTsModule("src/features/admin/services/admin-provider.ts");

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const MOD_ID = "22222222-2222-4222-8222-222222222222";
const MEMBER_ID = "33333333-3333-4333-8333-333333333333";
const RESOURCE_ID = "44444444-4444-4444-8444-444444444444";
const TOPIC_ID = "55555555-5555-4555-8555-555555555555";
const POST_ID = "66666666-6666-4666-8666-666666666666";
const REPORT_ID = "77777777-7777-4777-8777-777777777777";
const CAT_ID = "88888888-8888-4888-8888-888888888888";

const sampleDb = {
  profiles: [
    {
      id: ADMIN_ID,
      username: "alice_admin",
      display_name: "Alice Admin",
      avatar_url: null,
      bio: "Security lead",
      interests: ["appsec"],
      github_url: null,
      linkedin_url: null,
      preferred_locale: "pt-BR",
      role: "admin",
      is_suspended: false,
      created_at: "2026-11-01T10:00:00Z",
      updated_at: "2026-11-01T10:00:00Z",
    },
    {
      id: MOD_ID,
      username: "bob_mod",
      display_name: "Bob Mod",
      avatar_url: null,
      bio: null,
      interests: [],
      github_url: null,
      linkedin_url: null,
      preferred_locale: "en",
      role: "moderator",
      is_suspended: false,
      created_at: "2026-11-02T10:00:00Z",
      updated_at: "2026-11-02T10:00:00Z",
    },
    {
      id: MEMBER_ID,
      username: "charlie_member",
      display_name: "Charlie Member",
      avatar_url: null,
      bio: null,
      interests: [],
      github_url: null,
      linkedin_url: null,
      preferred_locale: "pt-BR",
      role: "member",
      is_suspended: false,
      created_at: "2026-11-03T10:00:00Z",
      updated_at: "2026-11-03T10:00:00Z",
    },
  ],
  categories: [
    { id: CAT_ID, slug: "appsec", name_pt: "AppSec", name_en: "AppSec" },
  ],
  resources: [
    {
      id: RESOURCE_ID,
      slug: "owasp-zap",
      name: "OWASP ZAP",
      description: "Web security scanner",
      category_id: CAT_ID,
      type: "tool",
      url: "https://www.zaproxy.org",
      language: "en",
      difficulty: "intermediate",
      author_name: "OWASP",
      submitted_by: MEMBER_ID,
      status: "pending",
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      published_at: null,
      created_at: "2026-11-10T10:00:00Z",
    },
  ],
  topics: [
    {
      id: TOPIC_ID,
      author_id: MEMBER_ID,
      category_id: CAT_ID,
      title: "XSS Mitigation",
      body: "Always encode untrusted output.",
      status: "published",
      is_pinned: false,
      is_locked: false,
      created_at: "2026-11-11T10:00:00Z",
      updated_at: "2026-11-11T10:00:00Z",
    },
  ],
  posts: [
    {
      id: POST_ID,
      topic_id: TOPIC_ID,
      author_id: MEMBER_ID,
      body: "Use CSP headers as defense in depth.",
      status: "published",
      created_at: "2026-11-12T10:00:00Z",
      updated_at: "2026-11-12T10:00:00Z",
    },
  ],
  reports: [
    {
      id: REPORT_ID,
      reporter_id: MEMBER_ID,
      topic_id: TOPIC_ID,
      post_id: null,
      resource_id: null,
      profile_id: null,
      reason: "spam",
      details: "Looks promotional",
      status: "open",
      handled_by: null,
      resolution_note: null,
      handled_at: null,
      created_at: "2026-11-13T10:00:00Z",
    },
  ],
  audit_logs: [
    {
      id: 101,
      actor_id: ADMIN_ID,
      action: "user.role_changed",
      entity_type: "profile",
      entity_id: MOD_ID,
      metadata: {
        previous_role: "member",
        new_role: "moderator",
        email: "secret@example.com",
      },
      created_at: new Date().toISOString(),
    },
    {
      id: 102,
      actor_id: MOD_ID,
      action: "topic.hide",
      entity_type: "topic",
      entity_id: TOPIC_ID,
      metadata: { reason: "Policy review" },
      created_at: new Date().toISOString(),
    },
  ],
};

function createMockSupabase({
  actorId = ADMIN_ID,
  actorRole = "admin",
  actorSuspended = false,
  unauthenticated = false,
  forceTableError = null,
  rpcHandler = null,
} = {}) {
  const rpcCalls = [];

  function buildQuery(table) {
    let rows = [...(sampleDb[table] ?? [])];
    let headOnly = false;
    let isSingle = false;
    let limitCount = null;

    const builder = {
      select(_cols, opts) {
        if (opts?.head) headOnly = true;
        return builder;
      },
      eq(col, val) {
        rows = rows.filter((r) => r[col] === val);
        return builder;
      },
      in(col, vals) {
        rows = rows.filter((r) => vals.includes(r[col]));
        return builder;
      },
      gte(col, val) {
        rows = rows.filter((r) => String(r[col] ?? "") >= String(val));
        return builder;
      },
      lte(col, val) {
        rows = rows.filter((r) => String(r[col] ?? "") <= String(val));
        return builder;
      },
      order(col, opts) {
        const asc = opts?.ascending ?? true;
        rows.sort((a, b) =>
          asc
            ? String(a[col] ?? "").localeCompare(String(b[col] ?? ""))
            : String(b[col] ?? "").localeCompare(String(a[col] ?? ""))
        );
        return builder;
      },
      limit(n) {
        limitCount = n;
        return builder;
      },
      maybeSingle() {
        isSingle = true;
        return builder;
      },
      single() {
        isSingle = true;
        return builder;
      },
      then(resolve) {
        if (forceTableError && forceTableError === table) {
          return resolve({
            data: null,
            error: { code: "42501", message: "Forbidden by RLS" },
            count: null,
          });
        }
        const sliced = limitCount !== null ? rows.slice(0, limitCount) : rows;
        if (headOnly) {
          return resolve({ data: null, error: null, count: rows.length });
        }
        if (isSingle) {
          return resolve({ data: sliced[0] ?? null, error: null });
        }
        return resolve({ data: sliced, error: null, count: sliced.length });
      },
    };
    return builder;
  }

  return {
    rpcCalls,
    auth: {
      async getUser() {
        if (unauthenticated) {
          return { data: { user: null }, error: null };
        }
        return {
          data: {
            user: {
              id: actorId,
              email: "actor@vexor.test",
            },
          },
          error: null,
        };
      },
    },
    from(table) {
      if (table === "profiles") {
        const b = buildQuery("profiles");
        const origEq = b.eq.bind(b);
        b.eq = (col, val) => {
          if (col === "id" && val === actorId) {
            return {
              ...b,
              select() {
                return this;
              },
              maybeSingle() {
                return Promise.resolve({
                  data: {
                    id: actorId,
                    username: "actor_user",
                    display_name: "Actor User",
                    avatar_url: null,
                    bio: null,
                    interests: [],
                    github_url: null,
                    linkedin_url: null,
                    preferred_locale: "pt-BR",
                    role: actorRole,
                    is_suspended: actorSuspended,
                  },
                  error: null,
                });
              },
              then(resolve) {
                return resolve({
                  data: [
                    {
                      id: actorId,
                      username: "actor_user",
                      role: actorRole,
                      is_suspended: actorSuspended,
                    },
                  ],
                  error: null,
                });
              },
            };
          }
          return origEq(col, val);
        };
        return b;
      }
      return buildQuery(table);
    },
    async rpc(fnName, params) {
      rpcCalls.push({ fnName, params });
      if (rpcHandler) {
        return rpcHandler(fnName, params);
      }
      return { data: null, error: null };
    },
  };
}

let passed = 0;
async function test(name, fn) {
  await fn();
  passed += 1;
  console.log(`  [PASS] ${name}`);
}

console.log("=== VEXOR Etapa 9.6 — Admin Supabase Integration Tests ===");

// 1-6: Server Authorization
await test("01. Unauthenticated request returns 401 on dashboard", async () => {
  const sb = createMockSupabase({ unauthenticated: true });
  const res = await handlers.handleGetAdminDashboard(sb);
  assert.equal(res.status, 401);
});

await test("02. Suspended moderator returns 403 on dashboard", async () => {
  const sb = createMockSupabase({ actorRole: "moderator", actorSuspended: true });
  const res = await handlers.handleGetAdminDashboard(sb);
  assert.equal(res.status, 403);
});

await test("03. Regular member returns 403 on moderation queue", async () => {
  const sb = createMockSupabase({ actorRole: "member" });
  const res = await handlers.handleListModerationQueue(sb);
  assert.equal(res.status, 403);
});

await test("04. Moderator is denied (403) on admin-only users & audit endpoints", async () => {
  const sb = createMockSupabase({ actorId: MOD_ID, actorRole: "moderator" });
  assert.equal((await handlers.handleListAdminUsers(sb)).status, 403);
  assert.equal(
    (await handlers.handleUpdateAdminUserRole(sb, { targetUserId: MEMBER_ID, newRole: "moderator" })).status,
    403
  );
  assert.equal((await handlers.handleListAdminAudit(sb)).status, 403);
  assert.equal((await handlers.handleGetAdminAuditSummary(sb)).status, 403);
  assert.equal((await handlers.handleExportAdminAudit(sb)).status, 403);
});

await test("05. Moderator is allowed (200) on dashboard, moderation, reports, resources", async () => {
  const sb = createMockSupabase({ actorId: MOD_ID, actorRole: "moderator" });
  assert.equal((await handlers.handleGetAdminDashboard(sb)).status, 200);
  assert.equal((await handlers.handleListModerationQueue(sb)).status, 200);
  assert.equal((await handlers.handleListAdminReports(sb)).status, 200);
  assert.equal((await handlers.handleListAdminResources(sb)).status, 200);
});

await test("06. Admin is allowed (200) on users & audit endpoints", async () => {
  const sb = createMockSupabase({ actorId: ADMIN_ID, actorRole: "admin" });
  assert.equal((await handlers.handleListAdminUsers(sb)).status, 200);
  assert.equal((await handlers.handleGetAdminUsersSummary(sb)).status, 200);
  assert.equal((await handlers.handleListAdminAudit(sb)).status, 200);
  assert.equal((await handlers.handleGetAdminAuditSummary(sb)).status, 200);
});

// 7-9: Dashboard
await test("07. Dashboard aggregates real counts", async () => {
  const sb = createMockSupabase();
  const res = await handlers.handleGetAdminDashboard(sb);
  assert.equal(res.status, 200);
  assert.equal(res.body.totalUsers, 3);
  assert.equal(res.body.pendingResources, 1);
  assert.equal(res.body.totalTopics, 1);
  assert.equal(res.body.totalPosts, 1);
  assert.equal(res.body.openReports, 1);
  assert.equal(res.body.pendingResearch, 0);
  assert.equal(res.body.totalPublications, 3);
});

await test("08. Dashboard propagates DB error instead of falling back to simulated data", async () => {
  const sb = createMockSupabase({ forceTableError: "resources" });
  const res = await handlers.handleGetAdminDashboard(sb);
  assert.equal(res.status, 403);
  assert.ok(res.body.error);
});

// 9-15: Users & RPCs
await test("09. Users list supports filtering and pagination", async () => {
  const sb = createMockSupabase();
  const res = await handlers.handleListAdminUsers(sb, { role: "moderator" }, { page: 1, pageSize: 10 });
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.items[0].username, "bob_mod");
});

await test("10. Users getUserById validates UUID and returns mapped profile", async () => {
  const sb = createMockSupabase();
  const bad = await handlers.handleGetAdminUserById(sb, "not-a-uuid");
  assert.equal(bad.status, 400);
  const ok = await handlers.handleGetAdminUserById(sb, MEMBER_ID);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.username, "charlie_member");
});

await test("11. Users summary computes real role and suspension counts", async () => {
  const sb = createMockSupabase();
  const res = await handlers.handleGetAdminUsersSummary(sb);
  assert.equal(res.status, 200);
  assert.equal(res.body.totalUsers, 3);
  assert.equal(res.body.adminUsers, 1);
  assert.equal(res.body.moderatorUsers, 1);
});

await test("12. Self-demote is blocked (403) before RPC", async () => {
  const sb = createMockSupabase({ actorId: ADMIN_ID, actorRole: "admin" });
  const res = await handlers.handleUpdateAdminUserRole(sb, {
    targetUserId: ADMIN_ID,
    newRole: "member",
  });
  assert.equal(res.status, 403);
  assert.equal(sb.rpcCalls.length, 0);
});

await test("13. Role update calls admin_set_user_role RPC with exact parameters", async () => {
  const sb = createMockSupabase({ actorId: ADMIN_ID, actorRole: "admin" });
  const res = await handlers.handleUpdateAdminUserRole(sb, {
    targetUserId: MEMBER_ID,
    newRole: "moderator",
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(sb.rpcCalls[0], {
    fnName: "admin_set_user_role",
    params: { p_user_id: MEMBER_ID, p_role: "moderator" },
  });
});

await test("14. Self-suspension is blocked (403) and short reason is rejected (400)", async () => {
  const sb = createMockSupabase({ actorId: ADMIN_ID, actorRole: "admin" });
  const selfRes = await handlers.handleUpdateAdminUserSuspension(sb, {
    targetUserId: ADMIN_ID,
    suspended: true,
    reason: "Valid reason here",
  });
  assert.equal(selfRes.status, 403);

  const shortRes = await handlers.handleUpdateAdminUserSuspension(sb, {
    targetUserId: MEMBER_ID,
    suspended: true,
    reason: "abc",
  });
  assert.equal(shortRes.status, 400);
  assert.equal(sb.rpcCalls.length, 0);
});

await test("15. Suspension and reactivation call admin_set_user_suspension RPC", async () => {
  const sb = createMockSupabase({ actorId: ADMIN_ID, actorRole: "admin" });
  const susp = await handlers.handleUpdateAdminUserSuspension(sb, {
    targetUserId: MEMBER_ID,
    suspended: true,
    reason: "Repeated policy violation",
  });
  assert.equal(susp.status, 200);
  assert.equal(sb.rpcCalls[0].fnName, "admin_set_user_suspension");
  assert.equal(sb.rpcCalls[0].params.p_suspended, true);

  const react = await handlers.handleUpdateAdminUserSuspension(sb, {
    targetUserId: MEMBER_ID,
    suspended: false,
  });
  assert.equal(react.status, 200);
  assert.equal(sb.rpcCalls[1].params.p_suspended, false);
});

// 16-22: Moderation & Resources
await test("16. Moderation queue combines resources, topics, posts with report counts", async () => {
  const sb = createMockSupabase();
  const res = await handlers.handleListModerationQueue(sb);
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 3);
  const topicItem = res.body.items.find((i) => i.contentType === "topic");
  assert.equal(topicItem.reportCount, 1);
  assert.equal(topicItem.priority, "high");
});

await test("17. Research tab returns empty without fabricating simulated items", async () => {
  const sb = createMockSupabase();
  const res = await handlers.handleListModerationQueue(sb, { contentType: "research" });
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 0);
});

await test("18. Unsupported moderation actions (escalate, request_revision) return 400", async () => {
  const sb = createMockSupabase();
  const esc = await handlers.handleExecuteModerationAction(sb, {
    id: RESOURCE_ID,
    contentType: "resource",
    action: "escalate",
    reason: "Escalating",
  });
  assert.equal(esc.status, 400);
  const resRev = await handlers.handleExecuteModerationAction(sb, {
    id: RESOURCE_ID,
    contentType: "research",
    action: "request_revision",
    reason: "Needs revision",
  });
  assert.equal(resRev.status, 400);
  assert.equal(sb.rpcCalls.length, 0);
});

await test("19. Resource moderation calls moderate_resource RPC and enforces rejection reason", async () => {
  const sb = createMockSupabase();
  const noReason = await handlers.handleExecuteModerationAction(sb, {
    id: RESOURCE_ID,
    contentType: "resource",
    action: "reject",
    reason: "no",
  });
  assert.equal(noReason.status, 400);

  const ok = await handlers.handleExecuteModerationAction(sb, {
    id: RESOURCE_ID,
    contentType: "resource",
    action: "approve",
  });
  assert.equal(ok.status, 200);
  assert.deepEqual(sb.rpcCalls[0], {
    fnName: "moderate_resource",
    params: { p_resource_id: RESOURCE_ID, p_decision: "approved", p_reason: undefined },
  });
});

await test("20. Topic moderation calls moderate_topic RPC", async () => {
  const sb = createMockSupabase();
  const ok = await handlers.handleExecuteModerationAction(sb, {
    id: TOPIC_ID,
    contentType: "topic",
    action: "hide",
    reason: "Contains unredacted token",
  });
  assert.equal(ok.status, 200);
  assert.deepEqual(sb.rpcCalls[0], {
    fnName: "moderate_topic",
    params: { p_topic_id: TOPIC_ID, p_action: "hide", p_reason: "Contains unredacted token" },
  });
});

await test("21. Post moderation calls moderate_post RPC", async () => {
  const sb = createMockSupabase();
  const ok = await handlers.handleExecuteModerationAction(sb, {
    id: POST_ID,
    contentType: "post",
    action: "delete",
    reason: "Spam payload",
  });
  assert.equal(ok.status, 200);
  assert.deepEqual(sb.rpcCalls[0], {
    fnName: "moderate_post",
    params: { p_post_id: POST_ID, p_action: "delete", p_reason: "Spam payload" },
  });
});

await test("22. getSupabaseModerationAvailableActions only exposes RPC-supported actions", async () => {
  assert.deepEqual(
    handlers.getSupabaseModerationAvailableActions({ contentType: "resource", status: "pending" }),
    ["approve", "reject", "archive"]
  );
  assert.deepEqual(
    handlers.getSupabaseModerationAvailableActions({ contentType: "research", status: "pending" }),
    []
  );
});

// 23-25: Reports
await test("23. Reports listing protects reporterUsername and maps target metadata", async () => {
  const sb = createMockSupabase();
  const res = await handlers.handleListAdminReports(sb);
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.items[0].reporterUsername, "protected");
  assert.equal(res.body.items[0].targetType, "topic");
});

await test("24. Report resolution rejects 'open' status (400) and calls resolve_report RPC", async () => {
  const sb = createMockSupabase();
  const bad = await handlers.handleResolveAdminReport(sb, {
    reportId: REPORT_ID,
    status: "open",
  });
  assert.equal(bad.status, 400);

  const ok = await handlers.handleResolveAdminReport(sb, {
    reportId: REPORT_ID,
    status: "resolved",
    note: "Verified and handled",
  });
  assert.equal(ok.status, 200);
  assert.deepEqual(sb.rpcCalls[0], {
    fnName: "resolve_report",
    params: { p_report_id: REPORT_ID, p_status: "resolved", p_note: "Verified and handled" },
  });
});

// 25-29: Audit
await test("25. Audit list resolves actorUsername and sanitizes sensitive metadata (email)", async () => {
  const sb = createMockSupabase();
  const res = await handlers.handleListAdminAudit(sb);
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 2);
  const roleEvt = res.body.items.find((e) => e.id === 101);
  assert.equal(roleEvt.actorUsername, "alice_admin");
  assert.equal(roleEvt.metadata.email, "[REDACTED_FOR_SECURITY]");
});

await test("26. Audit getAuditEntryById returns sanitized entry or null", async () => {
  const sb = createMockSupabase();
  const ok = await handlers.handleGetAdminAuditById(sb, 101);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.action, "user.role_changed");
  const missing = await handlers.handleGetAdminAuditById(sb, 99999);
  assert.equal(missing.status, 200);
  assert.equal(missing.body, null);
});

await test("27. Audit summary returns real counts", async () => {
  const sb = createMockSupabase();
  const res = await handlers.handleGetAdminAuditSummary(sb);
  assert.equal(res.status, 200);
  assert.equal(res.body.totalEvents, 2);
  assert.equal(res.body.adminChanges, 1);
});

await test("28. Audit export returns filtered entries read-only", async () => {
  const sb = createMockSupabase();
  const res = await handlers.handleExportAdminAudit(sb, { action: "topic.hide" });
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].id, 102);
});

// 29-31: Error Mapper & Provider Wiring
await test("29. Error mapper maps 42501, P0002, 22023, last-admin cleanly", async () => {
  assert.equal(errorMapper.mapSupabaseAdminError({ code: "42501", message: "forbidden" }).httpStatus, 403);
  assert.equal(errorMapper.mapSupabaseAdminError({ code: "P0002", message: "not found" }).httpStatus, 404);
  assert.equal(errorMapper.mapSupabaseAdminError({ code: "22023", message: "invalid" }).httpStatus, 400);
  assert.equal(
    errorMapper.mapSupabaseAdminError({ message: "Cannot demote the last active administrator" }).code,
    "last_admin"
  );
});

await test("30. Live adminDataProvider has no simulated fallback", async () => {
  assert.equal(typeof adminProviderMod.adminDataProvider.dashboard.getDashboardStats, "function");
  assert.equal("isSimulated" in adminProviderMod.adminDataProvider, false);
  assert.equal("createSimulatedAdminProvider" in adminProviderMod, false);
});

await test("31. Static check: no service_role or simulated fallback in Supabase admin provider/routes", async () => {
  const filesToCheck = [
    "src/features/admin/data/supabase-admin-provider.ts",
    "src/features/admin/server/admin-server-handlers.ts",
    "src/app/api/admin/dashboard/route.ts",
    "src/app/api/admin/users/route.ts",
    "src/app/api/admin/moderation/route.ts",
    "src/app/api/admin/reports/route.ts",
    "src/app/api/admin/resources/route.ts",
    "src/app/api/admin/audit/route.ts",
  ];
  for (const rel of filesToCheck) {
    const content = fs.readFileSync(path.resolve(projectRoot, rel), "utf8");
    assert.ok(!content.includes("service_role"), `${rel} must not reference service_role`);
    assert.ok(!content.includes("simulated-admin-data"), `${rel} must not import simulated-admin-data`);
  }
});

console.log(`\nPASS: ${passed}/${passed} scenarios passed.`);
