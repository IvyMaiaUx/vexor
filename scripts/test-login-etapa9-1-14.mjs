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
    }
    return nextResolve(mapped, context);
  },
});

const { loginWithSupabase } = await import("../src/features/auth/login-service.ts");

console.log("=== ETAPA 9.1.14 — LOGIN TEST SUITE ===");

const baseServerProfile = {
  id: "00000000-0000-0000-0000-000000000101",
  username: "analyst_01",
  display_name: "Analyst 01",
  avatar_url: null,
  bio: null,
  interests: ["AppSec"],
  github_url: null,
  linkedin_url: null,
  preferred_locale: "pt-BR",
  role: "member",
  is_suspended: false,
  created_at: "2026-11-13T00:00:00Z",
};

// 1 & 6. Successful login + valid internal redirect
const okRes = await loginWithSupabase({
  email: "analyst@vexor.test",
  password: "StrongPassword123!",
  nextPath: "/profile?tab=security",
  authClient: {
    async signInWithPassword({ email, password }) {
      assert.equal(email, "analyst@vexor.test");
      assert.equal(password, "StrongPassword123!");
      return {
        data: { user: { id: baseServerProfile.id, email }, session: { access_token: "tok" } },
        error: null,
      };
    },
  },
  async fetchSessionContext() {
    return {
      authenticated: true,
      user: { id: baseServerProfile.id, email: "analyst@vexor.test" },
      profile: baseServerProfile,
    };
  },
});
assert.equal(okRes.status, "authenticated");
assert.equal(okRes.safeRedirectPath, "/profile?tab=security");
assert.equal(okRes.profile.role, "member");
assert.equal(okRes.profile.isSuspended, false);
console.log("  ✓ Tests 1 & 6 passed (successful login + valid internal redirect)");

// 2. Invalid credentials (neutral error, no account enumeration)
const invalidRes = await loginWithSupabase({
  email: "unknown@vexor.test",
  password: "WrongPassword123!",
  authClient: {
    async signInWithPassword() {
      return {
        data: { user: null, session: null },
        error: { code: "invalid_credentials", message: "Invalid login credentials", status: 400 },
      };
    },
  },
  async fetchSessionContext() {
    throw new Error("Should not fetch session on failed sign-in");
  },
});
assert.deepEqual(invalidRes, { status: "error", errorCode: "invalid_credentials" });
console.log("  ✓ Test 2 passed (invalid credentials handled safely)");

// 3. Network error
const netRes = await loginWithSupabase({
  email: "analyst@vexor.test",
  password: "StrongPassword123!",
  authClient: {
    async signInWithPassword() {
      throw new Error("ECONNREFUSED");
    },
  },
});
assert.deepEqual(netRes, { status: "error", errorCode: "network_error" });
console.log("  ✓ Test 3 passed (network error handled safely)");

// 4. User without corresponding profile in public.profiles
const missingProfileRes = await loginWithSupabase({
  email: "noprofile@vexor.test",
  password: "StrongPassword123!",
  authClient: {
    async signInWithPassword() {
      return {
        data: { user: { id: "u-no-profile", email: "noprofile@vexor.test" }, session: { access_token: "tok" } },
        error: null,
      };
    },
  },
  async fetchSessionContext() {
    return {
      authenticated: true,
      user: { id: "u-no-profile", email: "noprofile@vexor.test" },
      profile: null,
    };
  },
});
assert.deepEqual(missingProfileRes, { status: "error", errorCode: "profile_missing" });
console.log("  ✓ Test 4 passed (missing profile rejected without manual profile creation)");

// 5. Suspended user
const suspendedRes = await loginWithSupabase({
  email: "suspended@vexor.test",
  password: "StrongPassword123!",
  nextPath: "/admin",
  authClient: {
    async signInWithPassword() {
      return {
        data: { user: { id: "u-susp", email: "suspended@vexor.test" }, session: { access_token: "tok" } },
        error: null,
      };
    },
  },
  async fetchSessionContext() {
    return {
      authenticated: true,
      user: { id: "u-susp", email: "suspended@vexor.test" },
      profile: { ...baseServerProfile, id: "u-susp", is_suspended: true },
    };
  },
});
assert.equal(suspendedRes.status, "suspended");
assert.equal(suspendedRes.profile.isSuspended, true);
assert.equal("safeRedirectPath" in suspendedRes, false);
console.log("  ✓ Test 5 passed (suspended user blocked from protected redirect)");

// 7. External redirect attempt sanitized
const extRedirectRes = await loginWithSupabase({
  email: "analyst@vexor.test",
  password: "StrongPassword123!",
  nextPath: "https://evil.com/phish",
  authClient: {
    async signInWithPassword() {
      return {
        data: { user: { id: baseServerProfile.id, email: "analyst@vexor.test" }, session: { access_token: "tok" } },
        error: null,
      };
    },
  },
  async fetchSessionContext() {
    return {
      authenticated: true,
      user: { id: baseServerProfile.id, email: "analyst@vexor.test" },
      profile: baseServerProfile,
    };
  },
});
assert.equal(extRedirectRes.status, "authenticated");
assert.equal(extRedirectRes.safeRedirectPath, "/catalog");
console.log("  ✓ Test 7 passed (external redirect sanitized to /catalog)");

// 8. Duplicate submission prevention in LoginPage
const loginPageCode = fs.readFileSync(path.join(rootDir, "src/app/login/page.tsx"), "utf8");
assert.match(loginPageCode, /if\s*\(isSubmitting\)\s*\{\s*return;\s*\}/);
assert.match(loginPageCode, /disabled=\{isSubmitting\}/);
assert.doesNotMatch(loginPageCode, /signInWithIdentifier\(/);
console.log("  ✓ Test 8 passed (duplicate submit prevented & no simulated fallback in real form)");

// 9. No password storage & no service_role in frontend
const loginServiceCode = fs.readFileSync(path.join(rootDir, "src/features/auth/login-service.ts"), "utf8");
const authStoreCode = fs.readFileSync(path.join(rootDir, "src/features/auth/use-auth-store.ts"), "utf8");
assert.doesNotMatch(loginServiceCode, /localStorage|sessionStorage|document\.cookie|service_role/i);
assert.doesNotMatch(loginPageCode, /localStorage|sessionStorage|service_role/i);
assert.doesNotMatch(authStoreCode, /setItem\([^)]*password/i);
console.log("  ✓ Test 9 passed (no password storage or service_role in frontend)");

// 10. Server-trusted role & suspension only + Runtime GET /api/auth/session tests
assert.doesNotMatch(loginServiceCode, /DEMO_PROFILES/);
assert.doesNotMatch(loginServiceCode, /\.insert\s*\(/i);
assert.match(authStoreCode, /DEMO_PROFILES/);
assert.match(authStoreCode, /signInWithProfile/);
assert.match(loginPageCode, /loginWithSupabase/);
assert.match(loginPageCode, /DEMO_PROFILES/);
assert.match(loginPageCode, /signInWithProfile/);
console.log("  ✓ Test 10 passed (DEMO_PROFILES separated from loginWithSupabase & no manual insert)");

// 11. Behavioral error coverage in loginWithSupabase (invalid_email, password_too_short, rate_limited, session authenticated:false)
function makeAuthFailTrap(flagObj) {
  return {
    authClient: {
      async signInWithPassword() {
        flagObj.authCalled = true;
        throw new Error("Should not call signInWithPassword on invalid input");
      },
    },
    async fetchSessionContext() {
      flagObj.sessionFetched = true;
      throw new Error("Should not call fetchSessionContext on invalid input");
    },
  };
}

function assertNoLoginSuccessOrRedirect(res) {
  assert.notEqual(res.status, "authenticated");
  assert.equal("safeRedirectPath" in res, false);
  if (res.status === "error") {
    assert.equal("profile" in res, false);
  }
}

const invalidFlags = { authCalled: false, sessionFetched: false };
const invalidTrap = makeAuthFailTrap(invalidFlags);

const invalidEmailRes = await loginWithSupabase({
  email: "not-an-email",
  password: "StrongPassword123!",
  nextPath: "/admin",
  ...invalidTrap,
});
assert.deepEqual(invalidEmailRes, { status: "error", errorCode: "invalid_email" });
assertNoLoginSuccessOrRedirect(invalidEmailRes);
assert.equal(invalidFlags.authCalled, false);
assert.equal(invalidFlags.sessionFetched, false);

const shortPwdRes = await loginWithSupabase({
  email: "analyst@vexor.test",
  password: "short",
  nextPath: "/admin",
  ...invalidTrap,
});
assert.deepEqual(shortPwdRes, { status: "error", errorCode: "password_too_short" });
assertNoLoginSuccessOrRedirect(shortPwdRes);
assert.equal(invalidFlags.authCalled, false);
assert.equal(invalidFlags.sessionFetched, false);

const rateLimitLoginRes = await loginWithSupabase({
  email: "analyst@vexor.test",
  password: "StrongPassword123!",
  nextPath: "/admin",
  authClient: {
    async signInWithPassword() {
      return {
        data: { user: null, session: null },
        error: { status: 429, code: "over_request_rate_limit", message: "Too many requests" },
      };
    },
  },
  async fetchSessionContext() {
    throw new Error("Should not fetch session on rate limit");
  },
});
assert.deepEqual(rateLimitLoginRes, { status: "error", errorCode: "rate_limited" });
assertNoLoginSuccessOrRedirect(rateLimitLoginRes);

const sessionUnauthRes = await loginWithSupabase({
  email: "analyst@vexor.test",
  password: "StrongPassword123!",
  nextPath: "/admin",
  authClient: {
    async signInWithPassword() {
      return {
        data: { user: { id: baseServerProfile.id, email: "analyst@vexor.test" }, session: { access_token: "tok" } },
        error: null,
      };
    },
  },
  async fetchSessionContext() {
    return {
      authenticated: false,
      user: null,
      profile: null,
    };
  },
});
assert.deepEqual(sessionUnauthRes, { status: "error", errorCode: "invalid_credentials" });
assertNoLoginSuccessOrRedirect(sessionUnauthRes);
assertNoLoginSuccessOrRedirect(invalidRes);
assertNoLoginSuccessOrRedirect(missingProfileRes);
assertNoLoginSuccessOrRedirect(suspendedRes);
console.log("  ✓ Test 11 passed (invalid_email, password_too_short, rate_limited, session authenticated:false & no redirect)");

// 11b. Negative self-tests for login traps and redirect/auth assertions
const negFlag = { authCalled: false, sessionFetched: false };
const negTrap = makeAuthFailTrap(negFlag);
await assert.rejects(() => negTrap.fetchSessionContext(), /Should not call fetchSessionContext/);
assert.equal(negFlag.sessionFetched, true);
assert.throws(() => assertNoLoginSuccessOrRedirect({ status: "suspended", safeRedirectPath: "/admin" }));
assert.throws(() => assertNoLoginSuccessOrRedirect({ status: "authenticated", safeRedirectPath: "/catalog" }));
console.log("  ✓ Test 11b passed (negative self-tests for fetchSessionContext trap & redirect guard)");

// 12. Real runtime execution of GET /api/auth/session
execFileSync(process.execPath, [path.join(__dirname, "test-session-endpoint-etapa9-1-18-4.mjs")], {
  stdio: "inherit",
});

console.log("=== ALL ETAPA 9.1.14 TESTS PASSED ===");
