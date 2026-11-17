import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
      }
    } else if (specifier === "next/headers") {
      mapped = pathToFileURL(path.join(rootDir, "node_modules/next/headers.js")).href;
    }
    return nextResolve(mapped, context);
  },
});

const {
  resolveServerSessionWithClient,
  evaluateSessionAuthorization,
  requireServerAuthorization,
  evaluateProtectedRouteAccess,
} = await import("../src/lib/supabase/auth.ts");

const {
  syncClientSessionFromServer,
  performConsistentSignOut,
  resetSyncCoordinatorForTests,
  SESSION_STORAGE_KEY,
  AUTH_MODE_STORAGE_KEY,
  readSyncMeta,
  writeSyncMeta,
} = await import("../src/features/auth/session-sync.ts");

function makeMockSupabase({ user = null, userError = null, throwAuth = false, profile = null, profileError = null, throwProfile = false } = {}) {
  return {
    auth: {
      async getUser() {
        if (throwAuth) {
          throw new Error("Network failure");
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
                    throw new Error("DB connection lost");
                  }
                  return { data: profile, error: profileError };
                },
              };
            },
          };
        },
      };
    },
  };
}

function makeMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

const sampleProfile = (overrides = {}) => ({
  id: "user-1",
  username: "sec_member",
  display_name: "Sec Member",
  avatar_url: null,
  bio: null,
  interests: ["Blue Team"],
  github_url: null,
  linkedin_url: null,
  preferred_locale: "pt-BR",
  role: "member",
  is_suspended: false,
  created_at: "2026-11-13T00:00:00Z",
  ...overrides,
});

console.log("=== ETAPA 9.1.15 — SESSION, PROFILE & AUTHORIZATION TEST SUITE ===");

// 1 & 4. Valid session + existing profile
const validClient = makeMockSupabase({
  user: { id: "user-1", email: "member@vexor.test" },
  profile: sampleProfile(),
});
const validRes = await resolveServerSessionWithClient(validClient);
assert.equal(validRes.status, "authenticated");
assert.equal(validRes.profile.id, "user-1");
console.log("  ✓ Tests 1 & 4 passed (valid session + existing profile)");

// 2. Missing session
const unauthRes = await resolveServerSessionWithClient(makeMockSupabase({ user: null }));
assert.equal(unauthRes.status, "unauthenticated");
assert.equal(evaluateSessionAuthorization(unauthRes, "active_member").httpStatus, 401);
console.log("  ✓ Test 2 passed (missing session -> unauthenticated / 401)");

// 3. Expired session (server + client sync)
const expiredRes = await resolveServerSessionWithClient(
  makeMockSupabase({
    user: null,
    userError: { status: 401, code: "session_expired", message: "JWT expired" },
  })
);
assert.equal(expiredRes.status, "unauthenticated");
const storageExp = makeMemoryStorage({
  [SESSION_STORAGE_KEY]: JSON.stringify({ username: "sec_member" }),
  [AUTH_MODE_STORAGE_KEY]: "supabase",
});
writeSyncMeta(storageExp, {
  authMode: "supabase",
  isLoading: false,
  sessionExpired: false,
  syncError: null,
});
const expiredMeta = await syncClientSessionFromServer({
  storage: storageExp,
  async fetchSession() {
    return {
      ok: true,
      status: 200,
      data: { authenticated: false, status: "unauthenticated", user: null, profile: null },
    };
  },
});
assert.equal(expiredMeta.sessionExpired, true);
assert.equal(storageExp.getItem(SESSION_STORAGE_KEY), null);
console.log("  ✓ Test 3 passed (expired session clears UI state and marks sessionExpired)");

// 5. Missing profile (no manual creation, no default permissions)
const missingProfRes = await resolveServerSessionWithClient(
  makeMockSupabase({ user: { id: "user-1", email: "member@vexor.test" }, profile: null })
);
assert.equal(missingProfRes.status, "profile_missing");
const missingAuth = evaluateSessionAuthorization(missingProfRes, "active_member");
assert.equal(missingAuth.allowed, false);
assert.equal(missingAuth.httpStatus, 403);
assert.equal(missingAuth.authorization.isActiveMember, false);
assert.equal(missingAuth.authorization.role, null);
console.log("  ✓ Test 5 passed (missing profile -> 403, zero permissions, no default role)");

// 6. Profile belonging to another user (ID mismatch)
const mismatchProfRes = await resolveServerSessionWithClient(
  makeMockSupabase({
    user: { id: "user-1", email: "member@vexor.test" },
    profile: sampleProfile({ id: "user-2", role: "admin" }),
  })
);
assert.equal(mismatchProfRes.status, "profile_missing");
assert.equal(evaluateSessionAuthorization(mismatchProfRes, "admin").allowed, false);
console.log("  ✓ Test 6 passed (profile belonging to another user rejected)");

// 7, 8, 9. Member, Moderator, Admin roles
const memberAuth = evaluateSessionAuthorization(
  { status: "authenticated", user: { id: "u1", email: "a@b.c" }, profile: sampleProfile({ id: "u1", role: "member" }) },
  "moderator"
);
assert.equal(memberAuth.allowed, false);
assert.equal(memberAuth.authorization.isActiveMember, true);
assert.equal(memberAuth.authorization.isModerator, false);

const modAuth = evaluateSessionAuthorization(
  { status: "authenticated", user: { id: "u2", email: "m@b.c" }, profile: sampleProfile({ id: "u2", role: "moderator" }) },
  "moderator"
);
assert.equal(modAuth.allowed, true);
assert.equal(modAuth.authorization.isAdmin, false);

const adminAuth = evaluateSessionAuthorization(
  { status: "authenticated", user: { id: "u3", email: "ad@b.c" }, profile: sampleProfile({ id: "u3", role: "admin" }) },
  "admin"
);
assert.equal(adminAuth.allowed, true);
assert.equal(adminAuth.authorization.isAdmin, true);
console.log("  ✓ Tests 7, 8 & 9 passed (member, moderator, admin authorization)");

// 10. Suspended user (even with role='admin' in DB, privileges are revoked)
const suspRes = await resolveServerSessionWithClient(
  makeMockSupabase({
    user: { id: "user-susp", email: "susp@vexor.test" },
    profile: sampleProfile({ id: "user-susp", role: "admin", is_suspended: true }),
  })
);
const suspAuth = evaluateSessionAuthorization(suspRes, "active_member");
assert.equal(suspAuth.allowed, false);
assert.equal(suspAuth.reason, "account_suspended");
assert.equal(suspAuth.authorization.isActiveMember, false);
assert.equal(suspAuth.authorization.isModerator, false);
assert.equal(suspAuth.authorization.isAdmin, false);
console.log("  ✓ Test 10 passed (suspended user stripped of all privileges)");

// 11. Client role tampering overwritten by server sync
const storageTamper = makeMemoryStorage({
  [SESSION_STORAGE_KEY]: JSON.stringify({ id: "user-1", username: "sec_member", role: "admin", isSuspended: false }),
  [AUTH_MODE_STORAGE_KEY]: "supabase",
});
await syncClientSessionFromServer({
  storage: storageTamper,
  async fetchSession() {
    return {
      ok: true,
      status: 200,
      data: {
        authenticated: true,
        status: "authenticated",
        user: { id: "user-1", email: "member@vexor.test" },
        profile: sampleProfile({ role: "member", is_suspended: false }),
      },
    };
  },
});
const syncedUser = JSON.parse(storageTamper.getItem(SESSION_STORAGE_KEY));
assert.equal(syncedUser.role, "member");
console.log("  ✓ Test 11 passed (client role tampering overwritten by server session)");

// 12. Store cleanup on unauthenticated server session
const storageLogout = makeMemoryStorage({
  [SESSION_STORAGE_KEY]: JSON.stringify({ username: "sec_member" }),
  [AUTH_MODE_STORAGE_KEY]: "supabase",
});
await syncClientSessionFromServer({
  storage: storageLogout,
  async fetchSession() {
    return {
      ok: true,
      status: 200,
      data: { authenticated: false, status: "unauthenticated", user: null, profile: null },
    };
  },
});
assert.equal(storageLogout.getItem(SESSION_STORAGE_KEY), null);
assert.equal(storageLogout.getItem(AUTH_MODE_STORAGE_KEY), null);
console.log("  ✓ Test 12 passed (logout clears SSR & client session)");

// 13. Connection failure (no silent fallback to DEMO_PROFILES & no undue logout of active session)
resetSyncCoordinatorForTests();
const connErrRes = await resolveServerSessionWithClient(makeMockSupabase({ throwAuth: true }));
assert.equal(connErrRes.status, "connection_error");
assert.equal(evaluateSessionAuthorization(connErrRes, "active_member").httpStatus, 503);
const storageConn = makeMemoryStorage({
  [SESSION_STORAGE_KEY]: JSON.stringify({ id: "user-1", username: "sec_member", role: "member" }),
  [AUTH_MODE_STORAGE_KEY]: "supabase",
});
writeSyncMeta(storageConn, {
  authMode: "supabase",
  isLoading: false,
  sessionExpired: false,
  syncError: null,
});
const connMeta = await syncClientSessionFromServer({
  storage: storageConn,
  async fetchSession() {
    throw new Error("ECONNREFUSED");
  },
});
assert.equal(connMeta.syncError, "connection_error");
assert.equal(connMeta.sessionExpired, false);
assert.notEqual(storageConn.getItem(SESSION_STORAGE_KEY), null);
assert.equal(readSyncMeta(storageConn).authMode, "supabase");
console.log("  ✓ Test 13 passed (connection failure sets syncError without undue logout or demo fallback)");

// 13b. Race condition, single-flight sync, and consistent deduplicated logout
resetSyncCoordinatorForTests();
let syncCalls = 0;
let resolveSlowFetch;
const slowPromise = new Promise((r) => {
  resolveSlowFetch = r;
});
const storageRace = makeMemoryStorage();
const p1 = syncClientSessionFromServer({
  storage: storageRace,
  fetchSession: () => {
    syncCalls += 1;
    return slowPromise;
  },
});
const p2 = syncClientSessionFromServer({
  storage: storageRace,
  fetchSession: () => {
    syncCalls += 1;
    return slowPromise;
  },
});
assert.equal(syncCalls, 1);

let serverLogoutCalls = 0;
let clientSignOutCalls = 0;
const logout1 = performConsistentSignOut({
  storage: storageRace,
  serverLogout: async () => {
    serverLogoutCalls += 1;
    throw new Error("Network down");
  },
  clientSignOut: async () => {
    clientSignOutCalls += 1;
  },
});
const logout2 = performConsistentSignOut({
  storage: storageRace,
  serverLogout: async () => {
    serverLogoutCalls += 1;
    return { ok: true };
  },
  clientSignOut: async () => {
    clientSignOutCalls += 1;
  },
});
resolveSlowFetch({
  ok: true,
  status: 200,
  data: {
    authenticated: true,
    status: "authenticated",
    user: { id: "user-1", email: "member@vexor.test" },
    profile: sampleProfile(),
  },
});
const [logoutRes1, logoutRes2] = await Promise.all([logout1, logout2, p1, p2]);
assert.equal(serverLogoutCalls, 1);
assert.equal(clientSignOutCalls, 1);
assert.equal(logoutRes1.networkError, true);
assert.equal(logoutRes2.networkError, true);
assert.equal(storageRace.getItem(SESSION_STORAGE_KEY), null);
assert.equal(readSyncMeta(storageRace).signOutError, true);
assert.equal(readSyncMeta(storageRace).isSigningOut, false);

// Automatic sync (focus/visibility/connection_error or authenticated) MUST preserve signOutError until retry succeeds
await syncClientSessionFromServer({
  storage: storageRace,
  async fetchSession() {
    throw new Error("ECONNREFUSED");
  },
});
assert.equal(readSyncMeta(storageRace).signOutError, true);
await syncClientSessionFromServer({
  storage: storageRace,
  async fetchSession() {
    return {
      ok: true,
      status: 200,
      data: {
        authenticated: true,
        status: "authenticated",
        user: { id: "user-1", email: "member@vexor.test" },
        profile: sampleProfile(),
      },
    };
  },
});
assert.equal(readSyncMeta(storageRace).signOutError, true);

// Retry logout after failure -> succeeds and clears signOutError
const retryRes = await performConsistentSignOut({
  storage: storageRace,
  serverLogout: async () => ({ ok: true }),
  clientSignOut: async () => {},
});
assert.equal(retryRes.ok, true);
assert.equal(retryRes.networkError, false);
assert.equal(readSyncMeta(storageRace).signOutError, false);
assert.equal(storageRace.getItem(SESSION_STORAGE_KEY), null);
console.log("  ✓ Test 13b passed (single-flight sync, epoch anti-race, deduplicated logout, failure feedback & retry)");

// 14. Admin route protection (evaluateProtectedRouteAccess)
assert.deepEqual(
  evaluateProtectedRouteAccess("/admin/users", { status: "unauthenticated", user: null, profile: null }),
  { action: "redirect", target: "/login?next=%2Fadmin%2Fusers", reason: "unauthenticated" }
);
assert.equal(
  evaluateProtectedRouteAccess("/admin", {
    status: "authenticated",
    user: { id: "u1", email: "a@b.c" },
    profile: sampleProfile({ id: "u1", role: "member" }),
  }).action,
  "redirect"
);
assert.equal(
  evaluateProtectedRouteAccess("/admin/moderation", {
    status: "authenticated",
    user: { id: "u2", email: "m@b.c" },
    profile: sampleProfile({ id: "u2", role: "moderator" }),
  }).action,
  "allow"
);
assert.equal(
  evaluateProtectedRouteAccess("/admin/users", {
    status: "authenticated",
    user: { id: "u2", email: "m@b.c" },
    profile: sampleProfile({ id: "u2", role: "moderator" }),
  }).action,
  "redirect"
);
assert.equal(
  evaluateProtectedRouteAccess("/admin/audit", {
    status: "authenticated",
    user: { id: "u3", email: "ad@b.c" },
    profile: sampleProfile({ id: "u3", role: "admin" }),
  }).action,
  "allow"
);
console.log("  ✓ Test 14 passed (admin route protection enforced on server)");

// 15. API operation authorization helper (requireServerAuthorization)
const apiDenied = await requireServerAuthorization(
  "admin",
  makeMockSupabase({ user: { id: "u1", email: "a@b.c" }, profile: sampleProfile({ id: "u1", role: "member" }) })
);
assert.equal(apiDenied.check.allowed, false);
assert.equal(apiDenied.check.httpStatus, 403);

const apiAllowed = await requireServerAuthorization(
  "admin",
  makeMockSupabase({ user: { id: "u3", email: "ad@b.c" }, profile: sampleProfile({ id: "u3", role: "admin" }) })
);
assert.equal(apiAllowed.check.allowed, true);
assert.equal(apiAllowed.check.httpStatus, 200);
console.log("  ✓ Test 15 passed (API authorization enforced on server)");

// 16. Cybercrime Research server-side protection & public route preservation
assert.deepEqual(
  evaluateProtectedRouteAccess("/cybercrime-research/labs", { status: "unauthenticated", user: null, profile: null }),
  { action: "redirect", target: "/login?next=%2Fcybercrime-research%2Flabs", reason: "unauthenticated" }
);
assert.equal(
  evaluateProtectedRouteAccess("/cybercrime-research", {
    status: "authenticated",
    user: { id: "u1", email: "a@b.c" },
    profile: sampleProfile({ id: "u1", role: "member", is_suspended: false }),
  }).action,
  "allow"
);
assert.equal(
  evaluateProtectedRouteAccess("/cybercrime-research/cases", {
    status: "authenticated",
    user: { id: "u1", email: "a@b.c" },
    profile: sampleProfile({ id: "u1", role: "member", is_suspended: true }),
  }).action,
  "redirect"
);
assert.equal(
  evaluateProtectedRouteAccess("/cybercrime-research/library", {
    status: "profile_missing",
    user: { id: "u1", email: "a@b.c" },
    profile: null,
  }).action,
  "redirect"
);
assert.equal(
  evaluateProtectedRouteAccess("/cybercrime-research", {
    status: "connection_error",
    user: null,
    profile: null,
  }).action,
  "redirect"
);
for (const publicRoute of ["/", "/login", "/register", "/forgot-password"]) {
  assert.equal(
    evaluateProtectedRouteAccess(publicRoute, { status: "unauthenticated", user: null, profile: null }).action,
    "allow"
  );
}
for (const memberRoute of ["/catalog", "/forum"]) {
  assert.equal(
    evaluateProtectedRouteAccess(memberRoute, { status: "unauthenticated", user: null, profile: null }).action,
    "redirect"
  );
}
console.log("  ✓ Test 16 passed (cybercrime-research server-side protection & public routes preserved)");

// 17. Runtime execution of layouts, POST /api/auth/logout, and SignOutErrorBanner
execFileSync(
  process.execPath,
  [path.join(__dirname, "test-runtime-ui-etapa9-1-15-2-2.mjs")],
  { stdio: "inherit" }
);

console.log("=== ALL ETAPA 9.1.15 TESTS PASSED ===");
