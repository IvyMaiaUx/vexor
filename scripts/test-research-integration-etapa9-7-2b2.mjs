/**
 * VEXOR — Etapa 9.7 (Fase 2B.2) — Testes de Integração Backend, Admin, TLP, Reports & Notifications
 */
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
    if (specifier === "@/lib/supabase/server" || specifier === "@/lib/supabase/client") {
      return {
        createClient: async () => {
          throw new Error("Live Supabase client must not be called in offline unit test");
        },
      };
    }
    if (specifier.startsWith("@/")) {
      const target = specifier.slice(2);
      for (const cand of [
        path.join("src", `${target}.ts`),
        path.join("src", `${target}.tsx`),
        path.join("src", target, "index.ts"),
      ]) {
        if (fs.existsSync(path.resolve(projectRoot, cand))) return loadTsModule(cand);
      }
    }
    if (specifier.startsWith(".")) {
      const base = path.dirname(absPath);
      for (const cand of [
        path.resolve(base, `${specifier}.ts`),
        path.resolve(base, `${specifier}.tsx`),
        path.resolve(base, specifier, "index.ts"),
      ]) {
        if (fs.existsSync(cand)) return loadTsModule(path.relative(projectRoot, cand));
      }
    }
    return require(specifier);
  };

  const fn = new Function("exports", "require", "module", "__filename", "__dirname", outputText);
  fn(mod.exports, localRequire, mod, absPath, path.dirname(absPath));
  return mod.exports;
}

const researchHandlers = loadTsModule(
  "src/features/cybercrime-research/server/research-server-handlers.ts"
);
const researchRepoMod = loadTsModule(
  "src/features/cybercrime-research/server/research-repository.ts"
);
const adminHandlers = loadTsModule("src/features/admin/server/admin-server-handlers.ts");
const reportService = loadTsModule("src/features/reports/report-service.ts");
const notificationService = loadTsModule("src/features/notifications/notification-service.ts");

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const MOD_ID = "22222222-2222-4222-8222-222222222222";
const AUTHOR_ID = "33333333-3333-4333-8333-333333333333";
const RECIPIENT_ID = "44444444-4444-4444-8444-444444444444";
const CAT_ID = "55555555-5555-4555-8555-555555555555";
const RESEARCH_ID = "66666666-6666-4666-8666-666666666666";

function createMockSupabase({
  actorId = AUTHOR_ID,
  actorRole = "member",
  isSuspended = false,
  authenticated = true,
  rpcError = null,
  dbError = null,
  rowsByTable = {},
} = {}) {
  const rpcCalls = [];
  const inserts = [];
  const updates = [];

  const buildChain = (table) => {
    const state = {
      filters: [],
      single: false,
      maybeSingle: false,
      op: "select",
      payload: null,
    };
    const execute = async () => {
      if (dbError) return { data: null, error: dbError, count: 0 };
      if (state.op === "insert") {
        inserts.push({ table, payload: state.payload });
        return {
          data: {
            id: RESEARCH_ID,
            slug: "test-research-66666666",
            status: table === "reports" ? "open" : "pending",
            reason: state.payload?.reason ?? "spam",
            research_id: state.payload?.research_id ?? null,
            created_at: "2026-11-16T09:00:00Z",
          },
          error: null,
        };
      }
      if (state.op === "update") {
        updates.push({ table, payload: state.payload, filters: state.filters });
        return { data: [{ id: RESEARCH_ID }], error: null };
      }

      if (table === "profiles") {
        const prof = {
          id: actorId,
          username: "actor_user",
          display_name: "Actor",
          role: actorRole,
          is_suspended: isSuspended,
        };
        return { data: state.single || state.maybeSingle ? prof : [prof], error: null, count: 1 };
      }
      if (table === "public_profiles") {
        const list = [
          { id: AUTHOR_ID, username: "author_sec", display_name: "Author Sec" },
          { id: RECIPIENT_ID, username: "rec_sec", display_name: "Rec Sec" },
        ];
        return { data: list, error: null };
      }
      const rows = rowsByTable[table] ?? [];
      if (state.maybeSingle) {
        const idFilter = state.filters.find((f) => f.col === "id");
        const found = idFilter ? rows.find((r) => r.id === idFilter.val) ?? null : rows[0] ?? null;
        return { data: found, error: null };
      }
      return { data: rows, error: null, count: rows.length };
    };

    const chain = {
      select() {
        return chain;
      },
      insert(payload) {
        state.op = "insert";
        state.payload = payload;
        return chain;
      },
      update(payload) {
        state.op = "update";
        state.payload = payload;
        return chain;
      },
      eq(col, val) {
        state.filters.push({ col, val });
        return chain;
      },
      in() {
        return chain;
      },
      order() {
        return chain;
      },
      single() {
        state.single = true;
        return execute();
      },
      maybeSingle() {
        state.maybeSingle = true;
        return execute();
      },
      then(resolve, reject) {
        return execute().then(resolve, reject);
      },
    };
    return chain;
  };

  return {
    rpcCalls,
    inserts,
    updates,
    auth: {
      async getUser() {
        if (!authenticated) return { data: { user: null }, error: null };
        return { data: { user: { id: actorId, email: "actor@vexor.test" } }, error: null };
      },
      async getClaims() {
        if (!authenticated) return { data: null, error: null };
        return { data: { claims: { sub: actorId } }, error: null };
      },
    },
    from: buildChain,
    async rpc(fnName, params) {
      rpcCalls.push({ fnName, params });
      return { data: null, error: rpcError };
    },
  };
}

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failed++;
    console.error(`  [FAIL] ${name}:`, err);
  }
}

console.log("=== VEXOR Etapa 9.7 (Fase 2B.2) — Research Real Integration Tests ===");

await test("01. Unauthenticated user receives 401 on research endpoints", async () => {
  const sb = createMockSupabase({ authenticated: false });
  const r1 = await researchHandlers.handleListResearch(sb, new URLSearchParams());
  const r2 = await researchHandlers.handleCreateResearch(sb, {});
  assert.equal(r1.status, 401);
  assert.equal(r2.status, 401);
});

await test("02. Suspended member receives 403 on all research operations", async () => {
  const sb = createMockSupabase({ isSuspended: true });
  const r1 = await researchHandlers.handleListResearch(sb, new URLSearchParams());
  const r2 = await researchHandlers.handleGetResearchById(sb, RESEARCH_ID);
  assert.equal(r1.status, 403);
  assert.equal(r2.status, 403);
});

await test("03. Active member creates and updates pending submission via Supabase repository", async () => {
  const sb = createMockSupabase({ actorId: AUTHOR_ID, actorRole: "member" });
  const createRes = await researchHandlers.handleCreateResearch(sb, {
    categoryId: CAT_ID,
    titlePt: "Análise Técnica de Ransomware X",
    summaryPt: "Resumo técnico detalhado com mais de vinte caracteres para validação.",
    bodyPt: "Corpo técnico detalhado com indicadores defensivos e metodologia completa.",
    domain: "ransomware",
    severity: "high",
    tlp: "AMBER+",
    cves: ["CVE-2024-12345"],
    attackTechniques: ["T1059.001"],
  });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.id, RESEARCH_ID);
  assert.equal(sb.inserts[0].table, "research_submissions");
  assert.equal("status" in sb.inserts[0].payload, false);

  const updRes = await researchHandlers.handleUpdateResearch(sb, RESEARCH_ID, {
    readTimeMinutes: 18,
  });
  assert.equal(updRes.status, 200);
  assert.equal(sb.updates[0].table, "research_submissions");
});

await test("04. Resubmission calls resubmit_research RPC with validated parameters", async () => {
  const sb = createMockSupabase({ actorId: AUTHOR_ID, actorRole: "member" });
  const res = await researchHandlers.handleResubmitResearch(sb, RESEARCH_ID, {
    categoryId: CAT_ID,
    titlePt: "Análise Técnica Corrigida",
    summaryPt: "Resumo técnico corrigido com mais de vinte caracteres para reenvio.",
    bodyPt: "Corpo técnico corrigido com mais de vinte caracteres e evidências.",
    domain: "apt",
    severity: "critical",
    tlp: "RED",
  });
  assert.equal(res.status, 200);
  assert.equal(sb.rpcCalls[0].fnName, "resubmit_research");
  assert.equal(sb.rpcCalls[0].params.p_research_id, RESEARCH_ID);
  assert.equal(sb.rpcCalls[0].params.p_tlp, "RED");
});

await test("05. Uniform 404 for private/restricted or nonexistent UUID (anti-enumeration)", async () => {
  const sb = createMockSupabase({ rowsByTable: { research_submissions: [] } });
  const res = await researchHandlers.handleGetResearchById(sb, RESEARCH_ID);
  assert.equal(res.status, 404);
  assert.equal(res.body.code, "not_found");
  const badUuid = await researchHandlers.handleGetResearchById(sb, "not-a-uuid");
  assert.equal(badUuid.status, 400);
});

await test("06. Recipient management requires moderator/admin, blocks self-grant, calls official RPCs", async () => {
  const memberSb = createMockSupabase({ actorId: AUTHOR_ID, actorRole: "member" });
  const denied = await researchHandlers.handleGrantResearchRecipient(memberSb, RESEARCH_ID, {
    userId: RECIPIENT_ID,
    justification: "Need to know access",
  });
  assert.equal(denied.status, 403);

  const modSb = createMockSupabase({ actorId: MOD_ID, actorRole: "moderator" });
  const selfGrant = await researchHandlers.handleGrantResearchRecipient(modSb, RESEARCH_ID, {
    userId: MOD_ID,
    justification: "Self grant attempt",
  });
  assert.equal(selfGrant.status, 403);
  assert.equal(modSb.rpcCalls.length, 0);

  const okGrant = await researchHandlers.handleGrantResearchRecipient(modSb, RESEARCH_ID, {
    userId: RECIPIENT_ID,
    justification: "Incident response team member",
  });
  assert.equal(okGrant.status, 200);
  assert.equal(modSb.rpcCalls[0].fnName, "grant_research_recipient");

  const okRevoke = await researchHandlers.handleRevokeResearchRecipient(
    modSb,
    RESEARCH_ID,
    RECIPIENT_ID
  );
  assert.equal(okRevoke.status, 200);
  assert.equal(modSb.rpcCalls[1].fnName, "revoke_research_recipient");
});

await test("07. SQLSTATE 55P03 maps to HTTP 409 Conflict without leaking PG internals", async () => {
  const sb = createMockSupabase({
    actorId: MOD_ID,
    actorRole: "moderator",
    rpcError: { code: "55P03", message: "could not obtain lock on row in relation profiles" },
  });
  const res = await researchHandlers.handleGrantResearchRecipient(sb, RESEARCH_ID, {
    userId: RECIPIENT_ID,
    justification: "Authorized IR team",
  });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, "lock_conflict");
  assert.equal(res.body.error.includes("relation profiles"), false);

  const adminRes = await adminHandlers.handleExecuteModerationAction(sb, {
    id: RESEARCH_ID,
    contentType: "research",
    action: "approve",
  });
  assert.equal(adminRes.status, 409);
});

await test("08. Admin moderation supports research approve/reject/archive via moderate_research RPC", async () => {
  const sb = createMockSupabase({ actorId: MOD_ID, actorRole: "moderator" });
  const shortReject = await adminHandlers.handleExecuteModerationAction(sb, {
    id: RESEARCH_ID,
    contentType: "research",
    action: "reject",
    reason: "abc",
  });
  assert.equal(shortReject.status, 400);

  const approve = await adminHandlers.handleExecuteModerationAction(sb, {
    id: RESEARCH_ID,
    contentType: "research",
    action: "approve",
  });
  assert.equal(approve.status, 200);
  assert.deepEqual(sb.rpcCalls[0], {
    fnName: "moderate_research",
    params: { p_research_id: RESEARCH_ID, p_decision: "approved", p_reason: null },
  });
});

await test("09. Network/DB failure returns 503/500 without silent fallback to mock data", async () => {
  const sbConnErr = createMockSupabase({
    dbError: { code: "08006", message: "connection failure to postgres.internal" },
  });
  const res503 = await researchHandlers.handleListResearch(sbConnErr, new URLSearchParams());
  assert.equal(res503.status, 503);
  assert.equal(res503.body.error.includes("postgres.internal"), false);
  assert.equal("items" in res503.body, false);

  const sbRepoErr = createMockSupabase();
  const origFrom = sbRepoErr.from.bind(sbRepoErr);
  sbRepoErr.from = (table) => {
    if (table === "research_submissions") {
      return {
        select() { return this; },
        eq() { return this; },
        order: async () => ({
          data: null,
          error: { code: "XX000", message: "internal failure on postgres.internal" },
        }),
      };
    }
    return origFrom(table);
  };
  const res500 = await researchHandlers.handleListResearch(sbRepoErr, new URLSearchParams());
  assert.equal(res500.status, 500);
  assert.equal(res500.body.error.includes("postgres.internal"), false);
  assert.equal("items" in res500.body, false);
});

await test("10. Reports & Notifications integrate research targets safely", async () => {
  const sb = createMockSupabase({ actorId: AUTHOR_ID, actorRole: "member" });
  const rep = await reportService.submitContentReport(
    { targetType: "research", targetId: RESEARCH_ID, reason: "spam", details: "Test report" },
    { client: sb }
  );
  assert.equal(rep.status, "success");
  assert.equal(sb.inserts[0].table, "reports");
  assert.equal(sb.inserts[0].payload.research_id, RESEARCH_ID);

  const href = notificationService.buildNotificationTargetHref(
    {
      type: "research_approved",
      topic_id: null,
      post_id: null,
      resource_id: null,
      research_id: RESEARCH_ID,
    },
    new Map()
  );
  assert.equal(href, `/cybercrime-research/library?research=${RESEARCH_ID}`);
});

await test("11. Static security checks: no service_role, no mock-adapter in prod handlers, no-store headers", () => {
  const files = [
    "src/features/cybercrime-research/server/research-repository.ts",
    "src/features/cybercrime-research/server/research-server-handlers.ts",
    "src/app/api/research/route.ts",
    "src/app/api/research/[id]/route.ts",
    "src/app/api/research/[id]/resubmit/route.ts",
    "src/app/api/research/[id]/recipients/route.ts",
    "src/app/api/research/[id]/recipients/[userId]/route.ts",
    "src/app/api/research/categories/route.ts",
  ];
  for (const rel of files) {
    const content = fs.readFileSync(path.join(projectRoot, rel), "utf8");
    assert.equal(content.includes("service_role"), false, `${rel} must not reference service_role`);
    assert.equal(content.includes("mock-research-adapter"), false, `${rel} must not use mock adapter`);
    if (rel.startsWith("src/app/api/")) {
      assert.equal(content.includes("no-store"), true, `${rel} must enforce Cache-Control: no-store`);
    }
  }
});

console.log(`\nPASS: ${passed}/${passed + failed} scenarios passed.`);
if (failed > 0) process.exit(1);
