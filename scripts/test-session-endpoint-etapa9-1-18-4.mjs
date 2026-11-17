import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcRoot = path.join(rootDir, "src");

const sessionTestState = {
  mockSupabase: null,
};
globalThis.__VEXOR_SESSION_ENDPOINT_TEST_STATE__ = sessionTestState;

const MOCK_SERVER_URL = pathToFileURL(path.join(rootDir, "__vexor_mock__/session-supabase-server.mjs")).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase/server") {
      return { url: MOCK_SERVER_URL, shortCircuit: true };
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
      !path.extname(specifier) &&
      context.parentURL?.startsWith("file:")
    ) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const candidate = path.resolve(parentDir, specifier);
      if (fs.existsSync(candidate + ".ts")) {
        mapped = pathToFileURL(candidate + ".ts").href;
      }
    } else if (specifier === "next/server") {
      mapped = pathToFileURL(path.join(rootDir, "node_modules/next/server.js")).href;
    }

    return nextResolve(mapped, context);
  },

  load(url, context, nextLoad) {
    if (url === MOCK_SERVER_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export async function createClient() {
            return globalThis.__VEXOR_SESSION_ENDPOINT_TEST_STATE__.mockSupabase;
          }
        `,
      };
    }
    return nextLoad(url, context);
  },
});

const { GET } = await import("../src/app/api/auth/session/route.ts");

function makeMockSupabase({
  user = null,
  userError = null,
  throwAuth = false,
  profile = null,
  profileError = null,
  throwProfile = false,
} = {}) {
  return {
    auth: {
      async getUser() {
        if (throwAuth) {
          throw new Error("ECONNREFUSED postgres://user:secret_dsn@db.internal:5432/vexor");
        }
        return { data: { user }, error: userError };
      },
    },
    from(table) {
      assert.equal(table, "profiles");
      return {
        select() {
          return {
            eq(col, val) {
              assert.equal(col, "id");
              assert.equal(val, user?.id);
              return {
                async maybeSingle() {
                  if (throwProfile) {
                    throw new Error("ECONNRESET postgres://user:secret_dsn@10.0.0.5:5432/vexor");
                  }
                  return { data: profile, error: profileError };
                },
              };
            },
          };
        },
        insert() {
          throw new Error("Session endpoint must never insert profiles");
        },
      };
    },
  };
}

function assertConnectionErrorContract(status, cacheControl, body) {
  assert.equal(status, 503);
  assert.equal(cacheControl, "no-store");
  assert.equal(body.authenticated, false);
  assert.equal(body.status, "connection_error");
  assert.equal(body.user, null);
  assert.equal(body.profile, null);
  assert.equal(body.authorization.isAuthenticated, false);
  const serialized = JSON.stringify(body);
  assert.doesNotMatch(serialized, /postgres:\/\/|secret_dsn|10\.0\.0\.5|ECONNREFUSED|ECONNRESET|timeout/i);
}

const baseProfile = {
  id: "00000000-0000-0000-0000-000000000101",
  username: "analyst_01",
  display_name: "Analyst 01",
  avatar_url: null,
  bio: null,
  interests: ["AppSec"],
  github_url: null,
  linkedin_url: null,
  preferred_locale: "pt-BR",
  role: "moderator",
  is_suspended: false,
  created_at: "2026-11-13T00:00:00Z",
};

console.log("=== ETAPA 9.1.18.4 — GET /api/auth/session RUNTIME TESTS ===");

// Scenario 1 — Authenticated session
sessionTestState.mockSupabase = makeMockSupabase({
  user: { id: baseProfile.id, email: "analyst@vexor.test" },
  profile: baseProfile,
});
{
  const res = await GET();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const body = await res.json();
  assert.equal(body.authenticated, true);
  assert.equal(body.status, "authenticated");
  assert.equal(body.user.id, baseProfile.id);
  assert.equal(body.profile.id, baseProfile.id);
  assert.equal(body.profile.role, "moderator");
  assert.equal(body.authorization.isAuthenticated, true);
  assert.equal(body.authorization.isActiveMember, true);
  assert.equal(body.authorization.isModerator, true);
  assert.equal(body.authorization.isAdmin, false);
}
console.log("  ✓ Scenario 1 passed (authenticated session -> 200, profile, server authz, no-store)");

// Scenario 2 — Unauthenticated user
sessionTestState.mockSupabase = makeMockSupabase({ user: null });
{
  const res = await GET();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const body = await res.json();
  assert.equal(body.authenticated, false);
  assert.equal(body.status, "unauthenticated");
  assert.equal(body.user, null);
  assert.equal(body.profile, null);
  assert.equal(body.authorization.isAuthenticated, false);
  assert.equal(body.authorization.isActiveMember, false);
}
console.log("  ✓ Scenario 2 passed (unauthenticated -> authenticated:false, null profile, no-store)");

// Scenario 3 — Profile missing
sessionTestState.mockSupabase = makeMockSupabase({
  user: { id: "u-missing", email: "missing@vexor.test" },
  profile: null,
});
{
  const res = await GET();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const body = await res.json();
  assert.equal(body.status, "profile_missing");
  assert.equal(body.profile, null);
  assert.equal(body.authorization.hasProfile, false);
  assert.equal(body.authorization.isActiveMember, false);
  assert.equal(body.authorization.role, null);
}
console.log("  ✓ Scenario 3 passed (profile_missing -> no auto-create, zero permissions, no-store)");

// Scenario 4 — Connection errors (4a: auth.getUser throws, 4b: profileError returned, 4c: profile query throws)
sessionTestState.mockSupabase = makeMockSupabase({ throwAuth: true });
{
  const res = await GET();
  assertConnectionErrorContract(res.status, res.headers.get("cache-control"), await res.json());
}

sessionTestState.mockSupabase = makeMockSupabase({
  user: { id: baseProfile.id, email: "analyst@vexor.test" },
  profileError: { message: "DB connection timeout: postgres://user:secret_dsn@10.0.0.5:5432" },
});
{
  const res = await GET();
  assertConnectionErrorContract(res.status, res.headers.get("cache-control"), await res.json());
}

sessionTestState.mockSupabase = makeMockSupabase({
  user: { id: baseProfile.id, email: "analyst@vexor.test" },
  throwProfile: true,
});
{
  const res = await GET();
  assertConnectionErrorContract(res.status, res.headers.get("cache-control"), await res.json());
}
console.log("  ✓ Scenario 4 passed (connection_error 4a/4b/4c -> HTTP 503, no-store, zero secret leakage)");

// Scenario 5 — Suspended profile (even with admin role)
sessionTestState.mockSupabase = makeMockSupabase({
  user: { id: "u-susp", email: "susp@vexor.test" },
  profile: { ...baseProfile, id: "u-susp", role: "admin", is_suspended: true },
});
{
  const res = await GET();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const body = await res.json();
  assert.equal(body.status, "authenticated");
  assert.equal(body.profile.is_suspended, true);
  assert.equal(body.authorization.isSuspended, true);
  assert.equal(body.authorization.isActiveMember, false);
  assert.equal(body.authorization.isModerator, false);
  assert.equal(body.authorization.isAdmin, false);
}
console.log("  ✓ Scenario 5 passed (suspended profile -> stripped of all privileges, no-store)");

// Scenario 6 — Inconsistent identity (profile.id !== user.id)
sessionTestState.mockSupabase = makeMockSupabase({
  user: { id: "u-real", email: "real@vexor.test" },
  profile: { ...baseProfile, id: "u-other", role: "admin", is_suspended: false },
});
{
  const res = await GET();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const body = await res.json();
  assert.equal(body.status, "profile_missing");
  assert.equal(body.profile, null);
  assert.equal(body.authorization.hasProfile, false);
  assert.equal(body.authorization.isActiveMember, false);
  assert.equal(body.authorization.isAdmin, false);
}
console.log("  ✓ Scenario 6 passed (inconsistent profile.id -> fail-closed, zero authz, no-store)");

// Scenario 7 — Negative self-test for connection_error contract validator
assert.throws(() =>
  assertConnectionErrorContract(200, "no-store", {
    authenticated: false,
    status: "connection_error",
    user: null,
    profile: null,
    authorization: { isAuthenticated: false },
  })
);
assert.throws(() =>
  assertConnectionErrorContract(503, "no-store", {
    authenticated: false,
    status: "connection_error",
    user: null,
    profile: null,
    authorization: { isAuthenticated: false },
    debug: "postgres://user:secret_dsn@db.internal:5432",
  })
);
console.log("  ✓ Scenario 7 passed (negative self-test detects wrong HTTP status or secret leakage)");

console.log("=== ALL GET /api/auth/session RUNTIME TESTS PASSED ===");
