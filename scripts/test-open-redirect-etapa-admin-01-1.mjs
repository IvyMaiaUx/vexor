import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcRoot = path.join(rootDir, "src");

const MOCK_NEXT_SERVER = `data:text/javascript,${encodeURIComponent(`
export class NextResponse {
  constructor(body, init = {}) {
    this.status = init.status ?? 200;
    this.headers = new Headers(init.headers ?? {});
  }
  static redirect(url) {
    return new NextResponse(null, {
      status: 307,
      headers: { location: typeof url === "string" ? url : url.toString() },
    });
  }
}
`)}`;

const MOCK_SUPABASE_SERVER = `data:text/javascript,${encodeURIComponent(`
export async function createClient() {
  return {
    auth: {
      exchangeCodeForSession: async () => ({ error: null }),
    },
  };
}
`)}`;

const MOCK_SUPABASE_CLIENT = `data:text/javascript,${encodeURIComponent(`
export function createClient() {
  return {
    auth: {
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: "mock" } }),
      signUp: async () => ({ data: { user: null, session: null }, error: { message: "mock" } }),
      resetPasswordForEmail: async () => ({ error: null }),
    },
  };
}
`)}`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") {
      return { url: MOCK_NEXT_SERVER, shortCircuit: true };
    }
    if (specifier === "@/lib/supabase/server") {
      return { url: MOCK_SUPABASE_SERVER, shortCircuit: true };
    }
    if (specifier === "@/lib/supabase/client") {
      return { url: MOCK_SUPABASE_CLIENT, shortCircuit: true };
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
      } else if (fs.existsSync(candidate + ".tsx")) {
        mapped = pathToFileURL(candidate + ".tsx").href;
      } else if (fs.existsSync(path.join(candidate, "index.ts"))) {
        mapped = pathToFileURL(path.join(candidate, "index.ts")).href;
      }
    }
    return nextResolve(mapped, context);
  },
});

const { getSafeRedirectPath } = await import(
  pathToFileURL(path.join(srcRoot, "lib/security/redirect.ts")).href
);
const { GET: callbackGet } = await import(
  pathToFileURL(path.join(srcRoot, "app/auth/callback/route.ts")).href
);
const { loginWithSupabase } = await import(
  pathToFileURL(path.join(srcRoot, "features/auth/login-service.ts")).href
);
const { registerWithSupabase } = await import(
  pathToFileURL(path.join(srcRoot, "features/auth/register-service.ts")).href
);
const { requestPasswordRecovery } = await import(
  pathToFileURL(path.join(srcRoot, "features/auth/recovery-service.ts")).href
);

console.log("=== VEXOR ETAPA 1.1 — OPEN REDIRECT SECURITY TEST SUITE ===");

// 1. Malicious redirect vectors must always resolve to defaultPath
const maliciousTargets = [
  "https://evil.example",
  "http://evil.example/phish",
  "//evil.example",
  "///evil.example",
  "\t//evil.example",
  "\\\\evil.example",
  "/\\evil.example",
  "/%5cevil.example",
  "/%5Cevil.example",
  "/%2f%5cevil.example",
  "/%255cevil.example",
  "/%2f/evil.example",
  "/%2f%2fevil.example",
  "/%252f%252fevil.example",
  "https%3A%2F%2Fevil.example",
  "%2F%2Fevil.example",
  "/catalog\nSet-Cookie: a=1",
  "/catalog\r\nLocation: https://evil.example",
  "/catalog\x00evil",
  "/%0aevil.example",
  "/%0d%0aSet-Cookie:a=1",
  "/%00",
  "/%7f",
  "javascript:alert(1)",
  "JAVASCRIPT:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "/auth/callback",
  "/auth/callback?code=abc",
  "/auth/callback/",
  "/auth/callback/nested",
  "/AUTH/callback",
  "/%61uth/callback",
  "",
  "   ",
  null,
  undefined,
  "/%E0%A4%A",
];

for (const target of maliciousTargets) {
  const actual = getSafeRedirectPath(target, "/catalog");
  assert.equal(
    actual,
    "/catalog",
    `Expected malicious/invalid target ${JSON.stringify(target)} to resolve to /catalog, got ${JSON.stringify(actual)}`
  );
}
console.log(`  ✓ Blocked all ${maliciousTargets.length} malicious, encoded, loop, and malformed redirect vectors`);

// 2. Valid internal paths must remain intact
const validTargets = [
  "/",
  "/profile",
  "/admin",
  "/cybercrime-research",
  "/catalog?q=nmap&page=2#top",
  "/admin/users?tab=1",
];

for (const target of validTargets) {
  const actual = getSafeRedirectPath(target, "/catalog");
  assert.equal(actual, target, `Expected valid internal path ${target} to remain intact, got ${actual}`);
}
console.log(`  ✓ Preserved all ${validTargets.length} valid internal redirect paths`);

// 3. Callback route behavioral tests (isolated mock for Supabase exchangeCodeForSession)
const callbackTests = [
  { query: "code=pkce-123&next=https://evil.example", expectedPath: "/catalog" },
  { query: "code=pkce-123&next=//evil.example", expectedPath: "/catalog" },
  { query: "code=pkce-123&next=/%5cevil.example", expectedPath: "/catalog" },
  { query: "code=pkce-123&next=/%252f%252fevil.example", expectedPath: "/catalog" },
  { query: "code=pkce-123&next=/auth/callback/", expectedPath: "/catalog" },
  { query: "code=pkce-123&next=/profile", expectedPath: "/profile" },
  { query: "code=pkce-123&type=recovery&next=https://evil.example", expectedPath: "/auth/reset-password" },
  { query: "code=pkce-123&type=recovery&next=/profile", expectedPath: "/auth/reset-password" },
  { query: "code=pkce-123&type=recovery&next=/auth/reset-password?step=2", expectedPath: "/auth/reset-password?step=2" },
];

for (const tc of callbackTests) {
  const reqUrl = new URL(`https://vexor.example/auth/callback?${tc.query}`);
  const res = await callbackGet({ nextUrl: reqUrl, url: reqUrl.toString() });
  const location = res.headers.get("location");
  assert.ok(location, `Expected Location header for ${tc.query}`);
  const dest = new URL(location);
  assert.equal(dest.origin, "https://vexor.example", `External redirect detected for ${tc.query}: ${location}`);
  assert.equal(`${dest.pathname}${dest.search}`, tc.expectedPath);
}
console.log(`  ✓ Callback route enforced same-origin redirects across all ${callbackTests.length} cases`);

// 4. Auth service integration checks (login, register, password recovery)
const loginBlocked = await loginWithSupabase({
  email: "member@vexor.example",
  password: "StrongPassword123!",
  nextPath: "/%5cevil.example",
  authClient: {
    signInWithPassword: async () => ({
      data: { user: { id: "u1", email: "member@vexor.example" }, session: { access_token: "t" } },
      error: null,
    }),
  },
  fetchSessionContext: async () => ({
    authenticated: true,
    user: { id: "u1", email: "member@vexor.example" },
    profile: {
      id: "u1",
      username: "member_one",
      display_name: "Member One",
      avatar_url: null,
      bio: null,
      interests: [],
      github_url: null,
      linkedin_url: null,
      preferred_locale: "pt-BR",
      role: "member",
      is_suspended: false,
      created_at: "2026-01-01T00:00:00Z",
    },
  }),
});
assert.equal(loginBlocked.status, "authenticated");
assert.equal(loginBlocked.safeRedirectPath, "/catalog");

const loginAllowed = await loginWithSupabase({
  email: "member@vexor.example",
  password: "StrongPassword123!",
  nextPath: "/cybercrime-research",
  authClient: {
    signInWithPassword: async () => ({
      data: { user: { id: "u1", email: "member@vexor.example" }, session: { access_token: "t" } },
      error: null,
    }),
  },
  fetchSessionContext: async () => ({
    authenticated: true,
    user: { id: "u1", email: "member@vexor.example" },
    profile: {
      id: "u1",
      username: "member_one",
      display_name: "Member One",
      avatar_url: null,
      bio: null,
      interests: [],
      github_url: null,
      linkedin_url: null,
      preferred_locale: "pt-BR",
      role: "member",
      is_suspended: false,
      created_at: "2026-01-01T00:00:00Z",
    },
  }),
});
assert.equal(loginAllowed.status, "authenticated");
assert.equal(loginAllowed.safeRedirectPath, "/cybercrime-research");

let capturedEmailRedirectTo = "";
const regResult = await registerWithSupabase({
  email: "newuser@vexor.example",
  username: "new_user",
  displayName: "New User",
  password: "StrongPassword123!",
  preferredLanguage: "pt-BR",
  nextPath: "/%252f%252fevil.example",
  origin: "https://vexor.example",
  authClient: {
    signUp: async (params) => {
      capturedEmailRedirectTo = params.options?.emailRedirectTo ?? "";
      return { data: { user: { id: "u2", identities: [{}] }, session: null }, error: null };
    },
  },
});
assert.equal(regResult.status, "confirmation_required");
assert.equal(regResult.safeRedirectPath, "/catalog");
assert.equal(capturedEmailRedirectTo, "https://vexor.example/auth/callback?next=%2Fcatalog");

const recResult = await requestPasswordRecovery({
  email: "member@vexor.example",
  nextPath: "https://evil.example/reset",
  origin: "https://vexor.example",
  authClient: {
    resetPasswordForEmail: async () => ({ error: null }),
  },
});
assert.equal(recResult.status, "dispatched");
assert.equal(
  recResult.redirectTo,
  "https://vexor.example/auth/callback?type=recovery&next=%2Fauth%2Freset-password"
);

console.log("  ✓ Login, registration, and password recovery services sanitize redirects properly");
console.log("ALL ETAPA 1.1 OPEN REDIRECT SECURITY CHECKS PASSED.");
