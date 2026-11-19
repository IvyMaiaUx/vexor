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
          throw new Error("createClient() must not be invoked in offline tests");
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

const validation = loadTsModule("src/features/cybercrime-research/validation.ts");
const mockAdapterMod = loadTsModule("src/features/cybercrime-research/data/mock-research-adapter.ts");
const handlers = loadTsModule("src/features/cybercrime-research/server/research-server-handlers.ts");
const serviceMod = loadTsModule("src/features/cybercrime-research/services/research-service.ts");

const MEMBER_ID = "11111111-1111-4111-8111-111111111111";
const MOD_ID = "22222222-2222-4222-8222-222222222222";

function createMockSupabase({
  actorId = MEMBER_ID,
  actorRole = "member",
  actorSuspended = false,
  unauthenticated = false,
} = {}) {
  const sampleRows = [
    {
      id: mockAdapterMod.MOCK_PUBLIC_RESEARCH_ID,
      slug: "public-approved-research",
      author_id: MOD_ID,
      category_id: mockAdapterMod.MOCK_CATEGORY_ID,
      title_pt: "Análise Pública de Ransomware",
      title_en: "Public Ransomware Analysis",
      summary_pt: "Resumo técnico público aprovado pela moderação para consulta da comunidade.",
      summary_en: null,
      body_pt: "Corpo técnico completo aprovado com indicadores de comprometimento e mitigação.",
      body_en: null,
      domain: "ransomware",
      severity: "high",
      tlp: "CLEAR",
      status: "approved",
      cves: ["CVE-2024-3094"],
      attack_techniques: ["T1059"],
      source_references: [],
      confidence_level: "high",
      methodology: "Análise estática e dinâmica.",
      read_time_minutes: 10,
      rejection_reason: null,
      reviewed_by: MOD_ID,
      reviewed_at: "2026-11-16T00:00:00Z",
      published_at: "2026-11-16T00:00:00Z",
      created_at: "2026-11-16T00:00:00Z",
      updated_at: "2026-11-16T00:00:00Z",
    },
    {
      id: mockAdapterMod.MOCK_PRIVATE_PENDING_ID,
      slug: "private-pending-research",
      author_id: MOD_ID,
      category_id: mockAdapterMod.MOCK_CATEGORY_ID,
      title_pt: "Rascunho Privado Pendente",
      title_en: null,
      summary_pt: "Resumo privado pendente de revisão pela equipe de moderação.",
      summary_en: null,
      body_pt: "Conteúdo restrito ainda em revisão e não visível para outros membros.",
      body_en: null,
      domain: "malware",
      severity: "medium",
      tlp: "GREEN",
      status: "pending",
      cves: [],
      attack_techniques: [],
      source_references: [],
      confidence_level: "medium",
      methodology: null,
      read_time_minutes: 8,
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      published_at: null,
      created_at: "2026-11-16T01:00:00Z",
      updated_at: "2026-11-16T01:00:00Z",
    },
  ];

  const isModOrAdmin = actorRole === "moderator" || actorRole === "admin";

  return {
    auth: {
      async getUser() {
        if (unauthenticated) return { data: { user: null }, error: null };
        return {
          data: { user: { id: actorId, email: "member@vexor.test" } },
          error: null,
        };
      },
    },
    from(table) {
      if (table === "profiles" || table === "public_profiles") {
        const filters = {};
        return {
          select() { return this; },
          eq(col, val) { filters[col] = val; return this; },
          in() { return Promise.resolve({ data: [{ id: MOD_ID, username: "mod_user", display_name: "Moderator" }], error: null }); },
          maybeSingle() {
            return Promise.resolve({
              data: {
                id: filters.id ?? actorId,
                username: "test_member",
                display_name: "Test Member",
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
        };
      }

      if (table === "categories") {
        return {
          select() { return this; },
          eq() { return this; },
          in() { return Promise.resolve({ data: [{ id: mockAdapterMod.MOCK_CATEGORY_ID, slug: "malware", name_pt: "Malware", name_en: "Malware", scope: "research" }], error: null }); },
          maybeSingle() { return Promise.resolve({ data: { id: mockAdapterMod.MOCK_CATEGORY_ID, slug: "malware", name_pt: "Malware", name_en: "Malware", scope: "research" }, error: null }); },
        };
      }

      if (table === "research_recipients") {
        return {
          select() { return this; },
          eq() { return this; },
          order() { return Promise.resolve({ data: [], error: null }); },
        };
      }

      if (table === "research_submissions") {
        const eqFilters = {};
        let mode = "select";
        const builder = {
          select() { return builder; },
          eq(col, val) { eqFilters[col] = val; return builder; },
          or() { return builder; },
          contains() { return builder; },
          order() { return builder; },
          insert() { mode = "insert"; return builder; },
          update() { mode = "update"; return builder; },
          range() {
            const visible = sampleRows.filter((r) => isModOrAdmin || r.status === "approved" || r.author_id === actorId);
            return Promise.resolve({ data: visible, count: visible.length, error: null });
          },
          maybeSingle() {
            if (mode === "insert") {
              return Promise.resolve({
                data: {
                  id: "33333333-3333-4333-8333-333333333333",
                  slug: "analise-tecnica-info-stealer",
                  status: "pending",
                  created_at: "2026-11-17T00:00:00Z",
                },
                error: null,
              });
            }
            if (mode === "update") {
              return Promise.resolve({ data: { id: eqFilters.id ?? mockAdapterMod.MOCK_PUBLIC_RESEARCH_ID }, error: null });
            }
            const visible = sampleRows.filter((r) => isModOrAdmin || r.status === "approved" || r.author_id === actorId);
            const found = visible.find((r) => (!eqFilters.id || r.id === eqFilters.id)) ?? null;
            return Promise.resolve({ data: found, error: null });
          },
          single() { return builder.maybeSingle(); },
          then(resolve, reject) {
            if (mode === "update") {
              return Promise.resolve({
                data: [{ id: eqFilters.id ?? mockAdapterMod.MOCK_PUBLIC_RESEARCH_ID }],
                error: null,
              }).then(resolve, reject);
            }
            const visible = sampleRows.filter((r) => isModOrAdmin || r.status === "approved" || r.author_id === actorId);
            return Promise.resolve({ data: visible, count: visible.length, error: null }).then(resolve, reject);
          },
        };
        return builder;
      }

      throw new Error(`Unexpected table queried in test mock: ${table}`);
    },
  };
}

const validCreatePayload = {
  categoryId: mockAdapterMod.MOCK_CATEGORY_ID,
  titlePt: "Análise Técnica de Info-Stealer em Campanha Corporativa",
  titleEn: "Technical Analysis of Info-Stealer Campaign",
  summaryPt: "Resumo técnico detalhado sobre vetores de infecção e extração de tokens.",
  bodyPt: "Corpo técnico completo descrevendo telemetria, indicadores de rede e detecção defensiva.",
  domain: "malware",
  severity: "high",
  tlp: "AMBER+",
  cves: ["CVE-2024-3094"],
  attackTechniques: ["T1059", "T1027.002"],
  sourceReferences: [
    { title: "MITRE ATT&CK", url: "https://attack.mitre.org/", isExternal: true },
  ],
  confidenceLevel: "high",
  methodology: "Triagem em sandbox isolada com análise de memória.",
  readTimeMinutes: 15,
};

let passed = 0;
async function test(name, fn) {
  await fn();
  passed += 1;
  console.log(`  [PASS] ${name}`);
}

console.log("=== VEXOR Etapa 9.7 (Fase 2A) — Research Backend Tests ===");

await test("01. Valid create payload passes schema validation including TLP 2.0 AMBER+", async () => {
  const res = validation.validateResearchCreateInput(validCreatePayload);
  assert.equal(res.ok, true);
  assert.equal(res.value.tlp, "AMBER+");
});

await test("02. Mass assignment fields (status, authorId, slug, reviewed_by) are blocked", async () => {
  for (const field of ["status", "authorId", "author_id", "slug", "reviewed_by", "publishedAt"]) {
    const res = validation.validateResearchCreateInput({
      ...validCreatePayload,
      [field]: "tampered",
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, "mass_assignment_blocked");
  }
});

await test("03. Unsafe HTML/script tags and javascript: URIs are rejected", async () => {
  const scriptRes = validation.validateResearchCreateInput({
    ...validCreatePayload,
    bodyPt: "Texto técnico com <script>alert(1)</script> malicioso.",
  });
  assert.equal(scriptRes.ok, false);
  assert.equal(scriptRes.code, "unsafe_content");

  const jsUrlRes = validation.validateResearchCreateInput({
    ...validCreatePayload,
    sourceReferences: [{ title: "Ref", url: "javascript:alert(1)" }],
  });
  assert.equal(jsUrlRes.ok, false);
});

await test("04. Invalid CVE, ATT&CK ID and payload limits are rejected", async () => {
  const badCve = validation.validateResearchCreateInput({
    ...validCreatePayload,
    cves: ["NOT-A-CVE"],
  });
  assert.equal(badCve.ok, false);

  const badTech = validation.validateResearchCreateInput({
    ...validCreatePayload,
    attackTechniques: ["INVALID"],
  });
  assert.equal(badTech.ok, false);

  const tooManyCves = validation.validateResearchCreateInput({
    ...validCreatePayload,
    cves: Array.from({ length: 21 }, (_, i) => `CVE-2024-${1000 + i}`),
  });
  assert.equal(tooManyCves.ok, false);
  assert.equal(tooManyCves.code, "payload_limit");
});

await test("05. Anonymous user receives 401 on all research handlers", async () => {
  const sb = createMockSupabase({ unauthenticated: true });
  assert.equal((await handlers.handleListResearch(sb, new URLSearchParams())).status, 401);
  assert.equal(
    (await handlers.handleGetResearchById(sb, mockAdapterMod.MOCK_PUBLIC_RESEARCH_ID)).status,
    401
  );
  assert.equal((await handlers.handleCreateResearch(sb, validCreatePayload)).status, 401);
  assert.equal(
    (await handlers.handleUpdateResearch(sb, mockAdapterMod.MOCK_PUBLIC_RESEARCH_ID, { titlePt: "Novo título válido" })).status,
    401
  );
});

await test("06. Suspended member receives 403 on all research handlers", async () => {
  const sb = createMockSupabase({ actorSuspended: true });
  assert.equal((await handlers.handleListResearch(sb, new URLSearchParams())).status, 403);
  assert.equal(
    (await handlers.handleGetResearchById(sb, mockAdapterMod.MOCK_PUBLIC_RESEARCH_ID)).status,
    403
  );
  assert.equal((await handlers.handleCreateResearch(sb, validCreatePayload)).status, 403);
  assert.equal(
    (await handlers.handleUpdateResearch(sb, mockAdapterMod.MOCK_PUBLIC_RESEARCH_ID, { titlePt: "Novo título válido" })).status,
    403
  );
});

await test("07. Active member can list approved mock submissions and never sees private pending of others", async () => {
  const sb = createMockSupabase({ actorId: MEMBER_ID, actorRole: "member" });
  const res = await handlers.handleListResearch(sb, new URLSearchParams());
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 1);
  assert.equal(res.body.items[0].id, mockAdapterMod.MOCK_PUBLIC_RESEARCH_ID);
});

await test("08. Private pending record returns uniform 404 to non-author member, 200 to moderator", async () => {
  const memberSb = createMockSupabase({ actorId: MEMBER_ID, actorRole: "member" });
  const privRes = await handlers.handleGetResearchById(
    memberSb,
    mockAdapterMod.MOCK_PRIVATE_PENDING_ID
  );
  assert.equal(privRes.status, 404);

  const missingRes = await handlers.handleGetResearchById(
    memberSb,
    "99999999-9999-4999-8999-999999999999"
  );
  assert.equal(missingRes.status, 404);
  assert.equal(privRes.body.error, missingRes.body.error);

  const modSb = createMockSupabase({ actorId: MOD_ID, actorRole: "moderator" });
  const modRes = await handlers.handleGetResearchById(
    modSb,
    mockAdapterMod.MOCK_PRIVATE_PENDING_ID
  );
  assert.equal(modRes.status, 200);
});

await test("09. Pagination caps pageSize at MAX_PAGE_SIZE (50) and filters work", async () => {
  const parsed = validation.parseResearchListQuery(
    new URLSearchParams("page=2&pageSize=500&domain=ransomware&tlp=GREEN")
  );
  assert.equal(parsed.page, 2);
  assert.equal(parsed.pageSize, 50);
  assert.equal(parsed.filters.domain, "ransomware");
  assert.equal(parsed.filters.tlp, "GREEN");
});

await test("10. Adapter error returns 500 without silent fallback", async () => {
  const sb = createMockSupabase();
  const brokenAdapter = {
    isTestMockAdapter: true,
    async list() {
      throw new Error("Simulated adapter failure");
    },
    async getById() {
      throw new Error("Simulated adapter failure");
    },
  };
  const listRes = await handlers.handleListResearch(sb, new URLSearchParams(), brokenAdapter);
  assert.equal(listRes.status, 500);
  const detailRes = await handlers.handleGetResearchById(
    sb,
    mockAdapterMod.MOCK_PUBLIC_RESEARCH_ID,
    brokenAdapter
  );
  assert.equal(detailRes.status, 500);
});

await test("11. Write endpoints (POST/PATCH) validate payload and persist via repository", async () => {
  const sb = createMockSupabase();
  const badPost = await handlers.handleCreateResearch(sb, { titlePt: "ab" });
  assert.equal(badPost.status, 400);

  const validPost = await handlers.handleCreateResearch(sb, validCreatePayload);
  assert.equal(validPost.status, 201);
  assert.equal(validPost.body.status, "pending");

  const validPatch = await handlers.handleUpdateResearch(
    sb,
    mockAdapterMod.MOCK_PUBLIC_RESEARCH_ID,
    { titlePt: "Título Atualizado com Segurança" }
  );
  assert.equal(validPatch.status, 200);
  assert.equal(validPatch.body.success, true);
});

await test("12. Static security checks: no service_role, no localStorage, Cache-Control: no-store enforced", async () => {
  const files = [
    "src/features/cybercrime-research/services/research-service.ts",
    "src/features/cybercrime-research/server/research-server-handlers.ts",
    "src/features/cybercrime-research/data/mock-research-adapter.ts",
    "src/app/api/research/route.ts",
    "src/app/api/research/[id]/route.ts",
  ];
  for (const rel of files) {
    const content = fs.readFileSync(path.resolve(projectRoot, rel), "utf8");
    assert.ok(!content.includes("service_role"), `${rel} must not use service_role`);
    assert.ok(!content.includes("localStorage"), `${rel} must not use localStorage`);
  }
  const routeRoot = fs.readFileSync(path.resolve(projectRoot, "src/app/api/research/route.ts"), "utf8");
  const routeId = fs.readFileSync(path.resolve(projectRoot, "src/app/api/research/[id]/route.ts"), "utf8");
  assert.ok(routeRoot.includes("no-store"));
  assert.ok(routeId.includes("no-store"));
  assert.equal(typeof serviceMod.researchService.listSubmissions, "function");
});

console.log(`\nPASS: ${passed}/${passed} scenarios passed.`);
