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

const MOCK_AUTH_STORE_URL = pathToFileURL(
  path.join(rootDir, "__vexor_mock__/auth-store-cat93.mjs")
).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/features/auth/use-auth-store") {
      return { url: MOCK_AUTH_STORE_URL, shortCircuit: true };
    }

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
      context.parentURL?.startsWith("file:")
    ) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const candidate = path.resolve(parentDir, specifier);
      if (fs.existsSync(candidate + ".ts")) {
        mapped = pathToFileURL(candidate + ".ts").href;
      } else if (fs.existsSync(candidate + ".tsx")) {
        mapped = pathToFileURL(candidate + ".tsx").href;
      }
    }
    return nextResolve(mapped, context);
  },
  load(url, context, nextLoad) {
    if (url === MOCK_AUTH_STORE_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `export function useAuthStore() { return { user: null, isInitialized: true, isActiveMember: false }; }`,
      };
    }

    if (url.endsWith(".ts") || url.endsWith(".tsx")) {
      const source = fs.readFileSync(fileURLToPath(url), "utf8");
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
        fileName: fileURLToPath(url),
      });
      return {
        format: "module",
        shortCircuit: true,
        source: transpiled.outputText,
      };
    }
    return nextLoad(url, context);
  },
});

const catalogService = await import(
  pathToFileURL(path.join(srcRoot, "features/catalog/catalog-service.ts")).href
);

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const CAT_BLUE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CAT_DFIR_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const MOCK_CATEGORIES = [
  {
    id: CAT_BLUE_ID,
    slug: "blue-team",
    name_en: "Blue Team & SOC",
    name_pt: "Blue Team & SOC",
    description_en: "Defensive tools",
    description_pt: "Ferramentas defensivas",
    scope: "both",
    sort_order: 1,
    is_active: true,
  },
  {
    id: CAT_DFIR_ID,
    slug: "dfir",
    name_en: "DFIR",
    name_pt: "DFIR",
    description_en: "Forensics",
    description_pt: "Forense",
    scope: "resource",
    sort_order: 2,
    is_active: true,
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    slug: "forum-only",
    name_en: "Forum Only",
    name_pt: "Apenas Fórum",
    description_en: "",
    description_pt: "",
    scope: "forum",
    sort_order: 3,
    is_active: true,
  },
];

const MOCK_RESOURCES = [
  {
    id: "r1",
    slug: "sigma-rules",
    name: "Sigma Rules",
    description: "Generic signature format for SIEM detection rules.",
    category_id: CAT_BLUE_ID,
    type: "repository",
    url: "https://github.com/SigmaHQ/sigma",
    language: "en",
    difficulty: "intermediate",
    author_name: "SigmaHQ",
    submitted_by: USER_A,
    status: "approved",
    published_at: "2026-11-10T00:00:00Z",
    created_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "r2",
    slug: "volatility-3",
    name: "Volatility 3",
    description: "Advanced memory forensics framework for DFIR.",
    category_id: CAT_DFIR_ID,
    type: "framework",
    url: "https://github.com/volatilityfoundation/volatility3",
    language: "en",
    difficulty: "advanced",
    author_name: "Volatility Foundation",
    submitted_by: USER_B,
    status: "approved",
    published_at: "2026-11-12T00:00:00Z",
    created_at: "2026-11-12T00:00:00Z",
  },
  {
    id: "r3-pending",
    slug: "secret-pending",
    name: "Pending Tool",
    description: "Pending moderation item must not leak to public catalog.",
    category_id: CAT_BLUE_ID,
    type: "tool",
    url: "https://example.com/pending",
    language: "pt-BR",
    difficulty: "beginner",
    author_name: "Member",
    submitted_by: USER_A,
    status: "pending",
    published_at: null,
    created_at: "2026-11-13T00:00:00Z",
  },
  {
    id: "r4-rejected",
    slug: "rejected-tool",
    name: "Rejected Tool",
    description: "Rejected item must never appear in public catalog.",
    category_id: CAT_BLUE_ID,
    type: "tool",
    url: "https://example.com/rejected",
    language: "en",
    difficulty: "beginner",
    author_name: "Member",
    submitted_by: USER_A,
    status: "rejected",
    published_at: null,
    created_at: "2026-11-13T00:00:00Z",
  },
];

function createMockSupabase({
  user = { id: USER_A, email: "member@vexor.sec" },
  forceQueryError = false,
  forceBookmarkError = null,
  forceInsertError = null,
  initialBookmarks = [{ user_id: USER_A, resource_id: "r1", created_at: "2026-11-14T00:00:00Z" }],
} = {}) {
  const bookmarks = [...initialBookmarks];
  const insertedResources = [];

  return {
    bookmarks,
    insertedResources,
    auth: {
      async getUser() {
        return { data: { user }, error: null };
      },
    },
    from(table) {
      if (table === "categories") {
        return {
          select() {
            const filters = {};
            const chain = {
              eq(col, val) {
                filters[col] = val;
                return chain;
              },
              in(col, vals) {
                filters[col] = vals;
                return chain;
              },
              async order() {
                if (forceQueryError) {
                  return { data: null, error: { message: "DB error" } };
                }
                const data = MOCK_CATEGORIES.filter((c) => {
                  if (filters.is_active !== undefined && c.is_active !== filters.is_active) {
                    return false;
                  }
                  if (filters.scope && !filters.scope.includes(c.scope)) {
                    return false;
                  }
                  return true;
                });
                return { data, error: null };
              },
            };
            return chain;
          },
        };
      }

      if (table === "resources") {
        return {
          select() {
            const filters = { eq: {}, in: {} };
            let orExpr = null;
            let neqId = null;
            let orderBy = [];
            let rangeBounds = null;

            const execute = () => {
              if (forceQueryError) {
                return { data: null, count: null, error: { message: "Query failed", status: 500 } };
              }
              let rows = [...MOCK_RESOURCES];
              for (const [k, v] of Object.entries(filters.eq)) {
                rows = rows.filter((r) => r[k] === v);
              }
              for (const [k, vals] of Object.entries(filters.in)) {
                rows = rows.filter((r) => vals.includes(r[k]));
              }
              if (neqId) {
                rows = rows.filter((r) => r.id !== neqId);
              }
              if (orExpr) {
                const match = orExpr.match(/name\.ilike\.%([^%]+)%/);
                if (match) {
                  const needle = match[1].toLowerCase();
                  rows = rows.filter(
                    (r) =>
                      r.name.toLowerCase().includes(needle) ||
                      r.description.toLowerCase().includes(needle)
                  );
                }
              }
              if (orderBy.some((o) => o.col === "name")) {
                rows.sort((a, b) => a.name.localeCompare(b.name));
              } else {
                rows.sort((a, b) =>
                  (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at)
                );
              }
              const count = rows.length;
              if (rangeBounds) {
                rows = rows.slice(rangeBounds[0], rangeBounds[1] + 1);
              }
              return { data: rows, count, error: null };
            };

            const chain = {
              eq(col, val) {
                filters.eq[col] = val;
                return chain;
              },
              in(col, vals) {
                filters.in[col] = vals;
                return chain;
              },
              neq(col, val) {
                if (col === "id") neqId = val;
                return chain;
              },
              or(expr) {
                orExpr = expr;
                return chain;
              },
              order(col, opts) {
                orderBy.push({ col, opts });
                return chain;
              },
              range(from, to) {
                rangeBounds = [from, to];
                return Promise.resolve(execute());
              },
              limit(n) {
                rangeBounds = [0, n - 1];
                return Promise.resolve(execute());
              },
              async maybeSingle() {
                const res = execute();
                if (res.error) return { data: null, error: res.error };
                return { data: res.data[0] ?? null, error: null };
              },
              then(resolve) {
                return Promise.resolve(execute()).then(resolve);
              },
            };
            return chain;
          },
          insert(row) {
            insertedResources.push(row);
            return {
              select() {
                return {
                  async maybeSingle() {
                    if (forceInsertError) {
                      return { data: null, error: forceInsertError };
                    }
                    return {
                      data: {
                        id: "r-new",
                        slug: "new-security-tool",
                        name: row.name,
                        description: row.description,
                        category_id: row.category_id,
                        type: row.type,
                        url: row.url,
                        language: row.language,
                        difficulty: row.difficulty,
                        author_name: row.author_name,
                        submitted_by: user.id,
                        status: "pending",
                        published_at: null,
                        created_at: "2026-11-15T00:00:00Z",
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "bookmarks") {
        return {
          select() {
            const filters = {};
            const chain = {
              eq(col, val) {
                filters[col] = val;
                return chain;
              },
              order() {
                const rows = bookmarks.filter((b) =>
                  filters.user_id ? b.user_id === filters.user_id : true
                );
                return Promise.resolve({ data: rows, error: null });
              },
              then(resolve) {
                const rows = bookmarks.filter((b) =>
                  filters.user_id ? b.user_id === filters.user_id : true
                );
                return Promise.resolve({ data: rows, error: null }).then(resolve);
              },
            };
            return chain;
          },
          async insert(payload) {
            if (forceBookmarkError) {
              return { error: forceBookmarkError };
            }
            const items = Array.isArray(payload) ? payload : [payload];
            for (const item of items) {
              const exists = bookmarks.some(
                (b) => b.user_id === user.id && b.resource_id === item.resource_id
              );
              if (exists) {
                return { error: { code: "23505", message: "duplicate key" } };
              }
              bookmarks.push({
                user_id: user.id,
                resource_id: item.resource_id,
                created_at: new Date().toISOString(),
              });
            }
            return { error: null };
          },
          delete() {
            const filters = {};
            const chain = {
              eq(col, val) {
                filters[col] = val;
                return chain;
              },
              then(resolve) {
                if (forceBookmarkError) {
                  return Promise.resolve({ error: forceBookmarkError }).then(resolve);
                }
                for (let i = bookmarks.length - 1; i >= 0; i -= 1) {
                  const b = bookmarks[i];
                  if (
                    (!filters.user_id || b.user_id === filters.user_id) &&
                    (!filters.resource_id || b.resource_id === filters.resource_id)
                  ) {
                    bookmarks.splice(i, 1);
                  }
                }
                return Promise.resolve({ error: null }).then(resolve);
              },
            };
            return chain;
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

console.log("=== ETAPA 9.3 — CATALOG & BOOKMARKS SUPABASE INTEGRATION TESTS ===");

// 1-2. Categories & public catalog excludes pending/rejected
{
  const client = createMockSupabase();
  const catRes = await catalogService.fetchCatalogCategories({ client });
  assert.equal(catRes.status, "success");
  assert.equal(catRes.categories.length, 2); // forum-only excluded

  const listRes = await catalogService.queryCatalogResources({}, { client });
  assert.equal(listRes.status, "success");
  assert.equal(listRes.totalCount, 2);
  assert.ok(listRes.items.every((item) => item.status === "approved"));
  console.log("  ✓ 1. Categorias e listagem pública excluem pending/rejected");
}

// 3-6. Search, filters, sorting, pagination
{
  const client = createMockSupabase();
  const searchRes = await catalogService.queryCatalogResources(
    { search: "Volatility" },
    { client }
  );
  assert.equal(searchRes.totalCount, 1);
  assert.equal(searchRes.items[0].slug, "volatility-3");

  const alphaRes = await catalogService.queryCatalogResources(
    { sortBy: "alphabetical", page: 1, pageSize: 1 },
    { client }
  );
  assert.equal(alphaRes.totalCount, 2);
  assert.equal(alphaRes.totalPages, 2);
  assert.equal(alphaRes.items.length, 1);
  assert.equal(alphaRes.items[0].slug, "sigma-rules");

  const emptyRes = await catalogService.queryCatalogResources(
    { categorySlug: "nonexistent" },
    { client }
  );
  assert.equal(emptyRes.status, "success");
  assert.equal(emptyRes.items.length, 0);
  console.log("  ✓ 2. Pesquisa, filtros, ordenação, paginação e estado vazio");
}

// 7. Query error handled cleanly
{
  const client = createMockSupabase({ forceQueryError: true });
  const errRes = await catalogService.queryCatalogResources({}, { client });
  assert.equal(errRes.status, "error");
  assert.equal(errRes.items.length, 0);
  console.log("  ✓ 3. Erro de consulta tratado sem quebra");
}

// 8-12. Bookmarks CRUD, idempotency, unauthenticated, user isolation, failure
{
  const client = createMockSupabase();
  const read1 = await catalogService.fetchUserBookmarks({ client });
  assert.equal(read1.status, "authenticated");
  assert.deepEqual(read1.bookmarkedIds, ["r1"]);

  // Add r2
  const addRes = await catalogService.toggleUserBookmark("r2", false, {
    locale: "pt-BR",
    client,
  });
  assert.equal(addRes.status, "success");
  assert.equal(addRes.bookmarked, true);

  // Duplicate insert handled idempotently
  const dupRes = await catalogService.toggleUserBookmark("r2", false, {
    locale: "pt-BR",
    client,
  });
  assert.equal(dupRes.status, "success");

  // Remove r2
  const remRes = await catalogService.toggleUserBookmark("r2", true, {
    locale: "pt-BR",
    client,
  });
  assert.equal(remRes.status, "success");
  assert.equal(remRes.bookmarked, false);

  // Unauthenticated blocked
  const anonClient = createMockSupabase({ user: null });
  const anonRes = await catalogService.toggleUserBookmark("r1", false, {
    locale: "en",
    client: anonClient,
  });
  assert.equal(anonRes.status, "error");
  assert.equal(anonRes.errorCode, "unauthenticated");

  // Persistence failure (RLS denied)
  const rlsClient = createMockSupabase({
    forceBookmarkError: { code: "42501", message: "row-level security", status: 403 },
  });
  const failRes = await catalogService.toggleUserBookmark("r2", false, {
    locale: "pt-BR",
    client: rlsClient,
  });
  assert.equal(failRes.status, "error");
  assert.equal(failRes.errorCode, "rls_denied");

  // Legacy migration skips duplicates & non-approved
  const migRes = await catalogService.migrateLegacyLocalBookmarks(
    ["sigma-rules", "volatility-3", "secret-pending"],
    { client }
  );
  assert.equal(migRes.completed, true);
  assert.equal(migRes.migratedCount, 1); // only volatility-3 added; sigma-rules existed, pending ignored
  console.log("  ✓ 4. Favoritos: listar, adicionar, remover, duplicidade, auth, RLS e migração segura");
}

// 13-15. Resource submission: validation, authenticated identity, no privileged columns, duplicate URL
{
  const client = createMockSupabase();

  // Privileged field injection blocked
  const privRes = await catalogService.submitCatalogResource(
    {
      name: "Evil Tool",
      description: "Trying to bypass moderation status.",
      categoryId: CAT_BLUE_ID,
      type: "tool",
      url: "https://example.com/evil",
      language: "en",
      status: "approved",
    },
    { locale: "pt-BR", client }
  );
  assert.equal(privRes.status, "error");
  assert.equal(privRes.errorCode, "rls_denied");

  // Valid submission sends only granted columns and returns pending
  const okRes = await catalogService.submitCatalogResource(
    {
      name: "New Security Tool",
      description: "A defensive utility for inspecting packet captures.",
      categoryId: CAT_BLUE_ID,
      type: "tool",
      url: "HTTPS://Example.COM:443/",
      language: "en",
      difficulty: "intermediate",
      authorName: "@sec_member",
    },
    { locale: "pt-BR", client }
  );
  assert.equal(okRes.status, "success");
  assert.equal(okRes.resource.status, "pending");
  assert.equal(client.insertedResources[0].url, "https://example.com");
  assert.equal("status" in client.insertedResources[0], false);
  assert.equal("submitted_by" in client.insertedResources[0], false);

  // Duplicate URL (23505)
  const dupClient = createMockSupabase({
    forceInsertError: { code: "23505", message: "duplicate key" },
  });
  const dupSub = await catalogService.submitCatalogResource(
    {
      name: "Sigma Duplicate",
      description: "Duplicate URL should be rejected cleanly.",
      categoryId: CAT_BLUE_ID,
      type: "repository",
      url: "https://github.com/SigmaHQ/sigma",
      language: "en",
    },
    { locale: "en", client: dupClient }
  );
  assert.equal(dupSub.status, "error");
  assert.equal(dupSub.errorCode, "duplicate_url");
  console.log("  ✓ 5. Submissão de recursos: validação, identidade, sem campos privilegiados e URL duplicada");
}

console.log("=== ALL ETAPA 9.3 CATALOG & BOOKMARKS TESTS PASSED ===");
