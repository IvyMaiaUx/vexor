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

const MOCK_SERVER_URL = pathToFileURL(
  path.join(rootDir, "__vexor_mock__/supabase-server-recovery.mjs")
).href;

const callbackMockState = {
  exchangeResult: { error: null },
  throwExchange: false,
  lastCode: null,
};
globalThis.__VEXOR_RECOVERY_CALLBACK_MOCK__ = callbackMockState;

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
      mapped = pathToFileURL(
        path.join(rootDir, "node_modules/next/server.js")
      ).href;
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
            const state = globalThis.__VEXOR_RECOVERY_CALLBACK_MOCK__;
            return {
              auth: {
                async exchangeCodeForSession(code) {
                  state.lastCode = code;
                  if (state.throwExchange) {
                    throw new Error("Supabase network error");
                  }
                  return state.exchangeResult;
                },
              },
            };
          }
        `,
      };
    }

    return nextLoad(url, context);
  },
});

const { NextRequest } = await import("next/server");
const { GET: authCallbackGet } = await import(
  "../src/app/auth/callback/route.ts"
);
const {
  hasRecoveryAmrClaim,
  isValidFutureExpClaim,
  requestPasswordRecovery,
  validateRecoverySession,
  updatePasswordWithSupabase,
} = await import("../src/features/auth/recovery-service.ts");
const { loginWithSupabase } = await import(
  "../src/features/auth/login-service.ts"
);
const { registerWithSupabase } = await import(
  "../src/features/auth/register-service.ts"
);

const futureExp = Math.floor(Date.now() / 1000) + 3600;
const pastExp = Math.floor(Date.now() / 1000) - 60;

function makeRecoveryClient({
  user = { id: "u1", email: "u1@vexor.test" },
  userError = null,
  claims = { sub: "u1", exp: futureExp, amr: [{ method: "recovery", timestamp: 1710000000 }] },
  claimsError = null,
  updateError = null,
  throwOnGetUser = false,
  throwOnGetClaims = false,
  onUpdate = null,
} = {}) {
  return {
    async getUser() {
      if (throwOnGetUser) {
        throw new Error("ECONNREFUSED");
      }
      return { data: { user }, error: userError };
    },
    async getClaims() {
      if (throwOnGetClaims) {
        throw new Error("ECONNREFUSED");
      }
      return { data: claims ? { claims } : null, error: claimsError };
    },
    async updateUser(attrs) {
      onUpdate?.(attrs);
      return {
        data: { user: updateError ? null : user },
        error: updateError,
      };
    },
  };
}

console.log("=== ETAPA 9.1.16.2 — PASSWORD RECOVERY SECURITY & AUTHZ TEST SUITE ===");

// 1. Recovery request tests
{
  let capturedEmail = null;
  let capturedOptions = null;

  const resValid = await requestPasswordRecovery({
    email: "  Analyst@Vexor.Test ",
    origin: "https://vexor.example",
    authClient: {
      async resetPasswordForEmail(email, options) {
        capturedEmail = email;
        capturedOptions = options;
        return { data: {}, error: null };
      },
    },
  });
  assert.equal(resValid.status, "dispatched");
  assert.equal(capturedEmail, "analyst@vexor.test");
  assert.equal(
    capturedOptions.redirectTo,
    "https://vexor.example/auth/callback?type=recovery&next=%2Fauth%2Freset-password"
  );

  // Invalid email does not call Supabase
  let calledInvalid = false;
  const resInvalid = await requestPasswordRecovery({
    email: "not-an-email",
    origin: "https://vexor.example",
    authClient: {
      async resetPasswordForEmail() {
        calledInvalid = true;
        return { data: {}, error: null };
      },
    },
  });
  assert.deepEqual(resInvalid, { status: "error", errorCode: "invalid_email" });
  assert.equal(calledInvalid, false);

  // External redirect attempt blocked by getSafeRedirectPath
  let blockedRedirectOptions = null;
  await requestPasswordRecovery({
    email: "user@vexor.test",
    nextPath: "https://evil.example/phish",
    origin: "https://vexor.example",
    authClient: {
      async resetPasswordForEmail(_email, options) {
        blockedRedirectOptions = options;
        return { data: {}, error: null };
      },
    },
  });
  assert.equal(
    blockedRedirectOptions.redirectTo,
    "https://vexor.example/auth/callback?type=recovery&next=%2Fauth%2Freset-password"
  );

  // Anti-enumeration: user lookup error still returns neutral dispatched status
  const resNotFound = await requestPasswordRecovery({
    email: "unknown@vexor.test",
    origin: "https://vexor.example",
    authClient: {
      async resetPasswordForEmail() {
        return {
          data: null,
          error: { status: 400, code: "user_not_found", message: "User not found" },
        };
      },
    },
  });
  assert.equal(resNotFound.status, "dispatched");

  // Rate limit (429)
  const resRateLimit = await requestPasswordRecovery({
    email: "user@vexor.test",
    origin: "https://vexor.example",
    authClient: {
      async resetPasswordForEmail() {
        return {
          data: null,
          error: { status: 429, code: "over_email_send_rate_limit" },
        };
      },
    },
  });
  assert.deepEqual(resRateLimit, { status: "error", errorCode: "rate_limited" });

  // Network unavailable
  const resNetwork = await requestPasswordRecovery({
    email: "user@vexor.test",
    origin: "https://vexor.example",
    authClient: {
      async resetPasswordForEmail() {
        throw new Error("ECONNREFUSED");
      },
    },
  });
  assert.deepEqual(resNetwork, { status: "error", errorCode: "network_error" });

  console.log("  ✓ Recovery Request tests passed");
}

// 2. Callback route tests (real GET handler execution)
{
  // Valid recovery code
  callbackMockState.throwExchange = false;
  callbackMockState.exchangeResult = { error: null };
  const recOk = await authCallbackGet(
    new NextRequest(
      "https://vexor.example/auth/callback?type=recovery&next=%2Fauth%2Freset-password&code=pkce-code-123"
    )
  );
  assert.equal(callbackMockState.lastCode, "pkce-code-123");
  assert.equal(recOk.status, 307);
  assert.equal(
    recOk.headers.get("location"),
    "https://vexor.example/auth/reset-password"
  );

  // Tampered type=recovery without valid code
  const recTampered = await authCallbackGet(
    new NextRequest("https://vexor.example/auth/callback?type=recovery")
  );
  assert.equal(
    recTampered.headers.get("location"),
    "https://vexor.example/auth/reset-password?error=recovery_link_invalid"
  );

  // Invalid / expired / reused recovery code
  callbackMockState.exchangeResult = {
    error: { message: "Token has expired or is invalid" },
  };
  const recExpired = await authCallbackGet(
    new NextRequest(
      "https://vexor.example/auth/callback?type=recovery&code=used-code"
    )
  );
  assert.equal(
    recExpired.headers.get("location"),
    "https://vexor.example/auth/reset-password?error=recovery_link_invalid"
  );
  assert.equal(recExpired.headers.get("location").includes("used-code"), false);

  // Unexpected exception during exchangeCodeForSession
  callbackMockState.throwExchange = true;
  const recCrash = await authCallbackGet(
    new NextRequest(
      "https://vexor.example/auth/callback?type=recovery&code=boom-code"
    )
  );
  assert.equal(
    recCrash.headers.get("location"),
    "https://vexor.example/auth/reset-password?error=recovery_link_invalid"
  );
  callbackMockState.throwExchange = false;
  callbackMockState.exchangeResult = { error: null };

  // External open redirect blocked even on recovery callback
  const recOpenRedirect = await authCallbackGet(
    new NextRequest(
      "https://vexor.example/auth/callback?type=recovery&next=//evil.example&code=pkce-code-456"
    )
  );
  assert.equal(
    recOpenRedirect.headers.get("location"),
    "https://vexor.example/auth/reset-password"
  );

  // Email confirmation flow preserved
  const emailConfirmOk = await authCallbackGet(
    new NextRequest(
      "https://vexor.example/auth/callback?next=%2Fcatalog&code=email-code-789"
    )
  );
  assert.equal(
    emailConfirmOk.headers.get("location"),
    "https://vexor.example/catalog"
  );

  const emailConfirmMissing = await authCallbackGet(
    new NextRequest("https://vexor.example/auth/callback")
  );
  assert.equal(
    emailConfirmMissing.headers.get("location"),
    "https://vexor.example/login?error=auth_callback_failed"
  );

  console.log("  ✓ Callback tests passed");
}

// 3. REC-01 Critical Authorization & Session Context tests
{
  // Helper unit checks (both AMREntry[] and RFC-8176 string[])
  assert.equal(hasRecoveryAmrClaim({ amr: [{ method: "recovery" }] }), true);
  assert.equal(hasRecoveryAmrClaim({ amr: ["recovery"] }), true);
  assert.equal(hasRecoveryAmrClaim({ amr: [{ method: "password" }] }), false);
  assert.equal(hasRecoveryAmrClaim({ amr: ["password", "otp"] }), false);
  assert.equal(hasRecoveryAmrClaim({ amr: ["my-recovery-fake"] }), false);
  assert.equal(hasRecoveryAmrClaim({}), false);

  let updateCalls = 0;

  // 3a. Normal password login session MUST BE REJECTED
  const normalLoginClient = makeRecoveryClient({
    claims: { sub: "u1", exp: futureExp, amr: [{ method: "password", timestamp: 1710000000 }] },
    onUpdate: () => {
      updateCalls += 1;
    },
  });
  assert.equal(await validateRecoverySession(normalLoginClient), "invalid");
  const normalUpdateRes = await updatePasswordWithSupabase({
    newPassword: "StrongPassword!1",
    confirmPassword: "StrongPassword!1",
    authClient: normalLoginClient,
  });
  assert.deepEqual(normalUpdateRes, { status: "error", errorCode: "session_invalid" });
  assert.equal(updateCalls, 0);

  // 3b. Session without `amr` claim MUST BE REJECTED
  const noAmrClient = makeRecoveryClient({
    claims: { sub: "u1", exp: futureExp },
    onUpdate: () => {
      updateCalls += 1;
    },
  });
  assert.equal(await validateRecoverySession(noAmrClient), "invalid");

  // 3c. Session with `amr` missing recovery method (oauth) MUST BE REJECTED
  const oauthClient = makeRecoveryClient({
    claims: { sub: "u1", exp: futureExp, amr: ["oauth"] },
    onUpdate: () => {
      updateCalls += 1;
    },
  });
  assert.equal(await validateRecoverySession(oauthClient), "invalid");

  // 3d. Claim with mismatched `sub` MUST BE REJECTED
  const mismatchSubClient = makeRecoveryClient({
    user: { id: "u1" },
    claims: { sub: "u2", exp: futureExp, amr: [{ method: "recovery" }] },
  });
  assert.equal(await validateRecoverySession(mismatchSubClient), "invalid");

  // 3e. Expired recovery claim (`exp` in the past) MUST BE REJECTED
  const expiredClaimClient = makeRecoveryClient({
    claims: { sub: "u1", exp: pastExp, amr: [{ method: "recovery" }] },
  });
  assert.equal(await validateRecoverySession(expiredClaimClient), "invalid");

  // 3f. Missing session (`user: null`) MUST BE REJECTED
  assert.equal(
    await validateRecoverySession(makeRecoveryClient({ user: null })),
    "invalid"
  );

  // 3g. Valid recovery session (including simulated refresh across repeated checks)
  const validRecoveryClient = makeRecoveryClient({
    claims: { sub: "u1", exp: futureExp, amr: [{ method: "recovery" }] },
  });
  assert.equal(await validateRecoverySession(validRecoveryClient), "valid");
  assert.equal(await validateRecoverySession(validRecoveryClient), "valid");

  // 3h. Validation rules & error handling in updatePasswordWithSupabase
  const shortRes = await updatePasswordWithSupabase({
    newPassword: "short",
    confirmPassword: "short",
    authClient: validRecoveryClient,
  });
  assert.deepEqual(shortRes, { status: "error", errorCode: "password_too_short" });

  const mismatchRes = await updatePasswordWithSupabase({
    newPassword: "StrongPassword!1",
    confirmPassword: "DifferentPassword!1",
    authClient: validRecoveryClient,
  });
  assert.deepEqual(mismatchRes, { status: "error", errorCode: "password_mismatch" });

  // Weak password
  const weakRes = await updatePasswordWithSupabase({
    newPassword: "StrongPassword!1",
    confirmPassword: "StrongPassword!1",
    authClient: makeRecoveryClient({
      updateError: { status: 422, code: "weak_password", message: "Weak" },
    }),
  });
  assert.deepEqual(weakRes, { status: "error", errorCode: "weak_password" });

  // Same password
  const sameRes = await updatePasswordWithSupabase({
    newPassword: "StrongPassword!1",
    confirmPassword: "StrongPassword!1",
    authClient: makeRecoveryClient({
      updateError: {
        status: 422,
        code: "same_password",
        message: "New password should be different from the old password.",
      },
    }),
  });
  assert.deepEqual(sameRes, { status: "error", errorCode: "same_password" });

  // Expired token during updateUser
  const expiredTokenRes = await updatePasswordWithSupabase({
    newPassword: "StrongPassword!1",
    confirmPassword: "StrongPassword!1",
    authClient: makeRecoveryClient({
      updateError: { status: 401, code: "session_expired", message: "JWT expired" },
    }),
  });
  assert.deepEqual(expiredTokenRes, { status: "error", errorCode: "session_invalid" });
  assert.equal(JSON.stringify(expiredTokenRes).includes("StrongPassword!1"), false);

  // Network error on getUser / getClaims
  assert.equal(
    await validateRecoverySession(makeRecoveryClient({ throwOnGetClaims: true })),
    "network_error"
  );
  const netErrRes = await updatePasswordWithSupabase({
    newPassword: "StrongPassword!1",
    confirmPassword: "StrongPassword!1",
    authClient: makeRecoveryClient({ throwOnGetUser: true }),
  });
  assert.deepEqual(netErrRes, { status: "error", errorCode: "network_error" });

  // Successful update with recovery AMR
  let updatedPasswordArg = null;
  const okRes = await updatePasswordWithSupabase({
    newPassword: "StrongPassword!1",
    confirmPassword: "StrongPassword!1",
    authClient: makeRecoveryClient({
      onUpdate: (attrs) => {
        updatedPasswordArg = attrs.password;
      },
    }),
  });
  assert.deepEqual(okRes, { status: "updated" });
  assert.equal(updatedPasswordArg, "StrongPassword!1");

  // 3i. AUD-01A Strict `exp` validation (fail-closed)
  const fixedNowSec = 1_750_000_000;
  const fixedNowMs = fixedNowSec * 1000;

  assert.equal(isValidFutureExpClaim(fixedNowSec + 60, fixedNowMs), true);
  assert.equal(isValidFutureExpClaim(fixedNowSec, fixedNowMs), false);
  assert.equal(isValidFutureExpClaim(fixedNowSec - 1, fixedNowMs), false);
  assert.equal(isValidFutureExpClaim(undefined, fixedNowMs), false);
  assert.equal(isValidFutureExpClaim(null, fixedNowMs), false);
  assert.equal(isValidFutureExpClaim(String(fixedNowSec + 60), fixedNowMs), false);
  assert.equal(isValidFutureExpClaim("not-a-timestamp", fixedNowMs), false);
  assert.equal(isValidFutureExpClaim(0, fixedNowMs), false);
  assert.equal(isValidFutureExpClaim(-100, fixedNowMs), false);
  assert.equal(isValidFutureExpClaim(fixedNowSec + 60.5, fixedNowMs), false);
  assert.equal(isValidFutureExpClaim(Number.NaN, fixedNowMs), false);
  assert.equal(isValidFutureExpClaim(Number.POSITIVE_INFINITY, fixedNowMs), false);
  assert.equal(isValidFutureExpClaim(Number.NEGATIVE_INFINITY, fixedNowMs), false);

  const invalidExpCases = [
    { label: "missing exp", claims: { sub: "u1", amr: ["recovery"] } },
    { label: "undefined exp", claims: { sub: "u1", exp: undefined, amr: ["recovery"] } },
    { label: "null exp", claims: { sub: "u1", exp: null, amr: ["recovery"] } },
    { label: "numeric string exp", claims: { sub: "u1", exp: String(fixedNowSec + 300), amr: ["recovery"] } },
    { label: "invalid string exp", claims: { sub: "u1", exp: "invalid-date", amr: ["recovery"] } },
    { label: "zero exp", claims: { sub: "u1", exp: 0, amr: ["recovery"] } },
    { label: "negative exp", claims: { sub: "u1", exp: -3600, amr: ["recovery"] } },
    { label: "decimal exp", claims: { sub: "u1", exp: fixedNowSec + 60.25, amr: ["recovery"] } },
    { label: "NaN exp", claims: { sub: "u1", exp: Number.NaN, amr: ["recovery"] } },
    { label: "Infinity exp", claims: { sub: "u1", exp: Number.POSITIVE_INFINITY, amr: ["recovery"] } },
    { label: "expired exp", claims: { sub: "u1", exp: fixedNowSec - 1, amr: ["recovery"] } },
    { label: "exact current instant exp", claims: { sub: "u1", exp: fixedNowSec, amr: ["recovery"] } },
  ];

  for (const testCase of invalidExpCases) {
    const status = await validateRecoverySession(
      makeRecoveryClient({ claims: testCase.claims }),
      { nowMs: fixedNowMs }
    );
    assert.equal(status, "invalid", `Expected invalid for ${testCase.label}`);
  }

  assert.equal(
    await validateRecoverySession(
      makeRecoveryClient({
        claims: { sub: "u1", exp: fixedNowSec + 1, amr: ["recovery"] },
      }),
      { nowMs: fixedNowMs }
    ),
    "valid"
  );

  // 3j. AUD-01B Strict AMR validation & simulated TOKEN_REFRESHED scenarios
  assert.equal(
    hasRecoveryAmrClaim({ amr: [{ method: "password" }, { method: "recovery" }] }),
    true
  );
  assert.equal(hasRecoveryAmrClaim({ amr: ["password", "recovery"] }), true);
  assert.equal(hasRecoveryAmrClaim({ amr: [] }), false);
  assert.equal(hasRecoveryAmrClaim({ amr: "recovery" }), false);
  assert.equal(hasRecoveryAmrClaim({ amr: [null, { method: 123 }] }), false);
  assert.equal(hasRecoveryAmrClaim({ amr: ["password"] }), false);

  assert.equal(
    await validateRecoverySession(
      makeRecoveryClient({
        claims: {
          sub: "u1",
          exp: fixedNowSec + 300,
          amr: [{ method: "password" }, { method: "recovery" }],
        },
      }),
      { nowMs: fixedNowMs }
    ),
    "valid"
  );
  assert.equal(
    await validateRecoverySession(
      makeRecoveryClient({
        claims: { sub: "u1", exp: fixedNowSec + 300, amr: [] },
      }),
      { nowMs: fixedNowMs }
    ),
    "invalid"
  );
  assert.equal(
    await validateRecoverySession(
      makeRecoveryClient({
        claims: { sub: "u1", exp: fixedNowSec + 300, amr: "recovery" },
      }),
      { nowMs: fixedNowMs }
    ),
    "invalid"
  );

  // Simulated token refresh: 1st call has recovery AMR; 2nd call simulates refreshed JWT
  let refreshStep = 0;
  const preservedRefreshClient = {
    async getUser() {
      return { data: { user: { id: "u1", email: "u1@vexor.test" } }, error: null };
    },
    async getClaims() {
      refreshStep += 1;
      return {
        data: {
          claims: {
            sub: "u1",
            exp: fixedNowSec + (refreshStep === 1 ? 120 : 3600),
            amr: [{ method: "recovery", timestamp: fixedNowSec }],
          },
        },
        error: null,
      };
    },
  };
  assert.equal(
    await validateRecoverySession(preservedRefreshClient, { nowMs: fixedNowMs }),
    "valid"
  );
  assert.equal(
    await validateRecoverySession(preservedRefreshClient, { nowMs: fixedNowMs }),
    "valid"
  );

  let droppedAmrStep = 0;
  const droppedRefreshClient = {
    async getUser() {
      return { data: { user: { id: "u1", email: "u1@vexor.test" } }, error: null };
    },
    async getClaims() {
      droppedAmrStep += 1;
      return {
        data: {
          claims: {
            sub: "u1",
            exp: fixedNowSec + 3600,
            amr:
              droppedAmrStep === 1
                ? [{ method: "recovery", timestamp: fixedNowSec }]
                : [{ method: "token_refresh", timestamp: fixedNowSec + 60 }],
          },
        },
        error: null,
      };
    },
  };
  assert.equal(
    await validateRecoverySession(droppedRefreshClient, { nowMs: fixedNowMs }),
    "valid"
  );
  assert.equal(
    await validateRecoverySession(droppedRefreshClient, { nowMs: fixedNowMs }),
    "invalid"
  );

  // 3k. Strict identity (`sub`, `user`, errors) fail-closed tests
  assert.equal(
    await validateRecoverySession(
      makeRecoveryClient({
        user: { id: "u1" },
        claims: { exp: fixedNowSec + 300, amr: ["recovery"] },
      }),
      { nowMs: fixedNowMs }
    ),
    "invalid"
  );
  assert.equal(
    await validateRecoverySession(
      makeRecoveryClient({
        user: { id: "u1" },
        claims: { sub: "", exp: fixedNowSec + 300, amr: ["recovery"] },
      }),
      { nowMs: fixedNowMs }
    ),
    "invalid"
  );
  assert.equal(
    await validateRecoverySession(
      makeRecoveryClient({
        claimsError: { status: 401, code: "bad_jwt", message: "Invalid JWT" },
      }),
      { nowMs: fixedNowMs }
    ),
    "invalid"
  );
  assert.equal(
    await validateRecoverySession(
      makeRecoveryClient({
        userError: { status: 401, code: "session_not_found", message: "No session" },
      }),
      { nowMs: fixedNowMs }
    ),
    "invalid"
  );
  assert.equal(
    await validateRecoverySession(
      makeRecoveryClient({ throwOnGetUser: true }),
      { nowMs: fixedNowMs }
    ),
    "network_error"
  );

  console.log("  ✓ Recovery Session Authorization & Password Update tests passed");
}

// 4. Regression checks for login & register services
{
  const loginRes = await loginWithSupabase({
    email: "member@vexor.test",
    password: "StrongPassword!1",
    authClient: {
      async signInWithPassword() {
        return {
          data: { user: { id: "u1", email: "member@vexor.test" }, session: {} },
          error: null,
        };
      },
    },
    fetchSessionContext: async () => ({
      authenticated: true,
      user: { id: "u1", email: "member@vexor.test" },
      profile: {
        id: "u1",
        username: "member_1",
        display_name: "Member 1",
        avatar_url: null,
        bio: null,
        interests: [],
        github_url: null,
        linkedin_url: null,
        preferred_locale: "pt-BR",
        role: "member",
        is_suspended: false,
        created_at: "2026-11-14T00:00:00Z",
      },
    }),
  });
  assert.equal(loginRes.status, "authenticated");

  const regRes = await registerWithSupabase({
    email: "new@vexor.test",
    username: "new_user",
    displayName: "New User",
    password: "StrongPassword!1",
    preferredLanguage: "pt-BR",
    origin: "https://vexor.example",
    authClient: {
      async signUp() {
        return {
          data: { user: { id: "u2", identities: [{}] }, session: null },
          error: null,
        };
      },
    },
  });
  assert.equal(regRes.status, "confirmation_required");

  console.log("  ✓ Regression tests passed (loginWithSupabase & registerWithSupabase)");
}

// 5. Execute React component render & state checks (without jsdom)
execFileSync(
  process.execPath,
  [path.join(__dirname, "test-recovery-ui-etapa9-1-16-2.mjs")],
  { stdio: "inherit" }
);

console.log("=== ALL ETAPA 9.1.16.2 TESTS PASSED ===");
