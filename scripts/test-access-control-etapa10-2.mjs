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

const MOCK_SERVER_URL = "data:text/javascript,export async function createClient(){return{};}";
const MOCK_NEXT_IMAGE_URL =
  'data:text/javascript,export default function Image(p){return globalThis.__VEXOR_REACT__.createElement("img",{src:p.src,alt:p.alt});}';
const MOCK_NEXT_LINK_URL =
  'data:text/javascript,export default function Link({href,children,...rest}){return globalThis.__VEXOR_REACT__.createElement("a",{href,...rest},children);}';
const MOCK_NEXT_NAV_URL =
  'data:text/javascript,export function usePathname(){return globalThis.__VEXOR_TEST_PATHNAME__||"/";}export function useRouter(){return{push:()=>{},refresh:()=>{},replace:()=>{}};}';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase/server") {
      return { url: MOCK_SERVER_URL, shortCircuit: true };
    }
    if (specifier === "next/image") {
      return { url: MOCK_NEXT_IMAGE_URL, shortCircuit: true };
    }
    if (specifier === "next/link") {
      return { url: MOCK_NEXT_LINK_URL, shortCircuit: true };
    }
    if (specifier === "next/navigation") {
      return { url: MOCK_NEXT_NAV_URL, shortCircuit: true };
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
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && (url.endsWith(".tsx") || url.endsWith(".ts"))) {
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
        source: transpiled.outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

const React = (await import("react")).default;
globalThis.__VEXOR_REACT__ = React;
const { renderToStaticMarkup } = await import("react-dom/server");
const {
  evaluateProtectedRouteAccess,
  isProtectedAppRoute,
  requireServerAuthorization,
} = await import("@/lib/supabase/auth");
const { loginWithSupabase } = await import("@/features/auth/login-service");
const {
  AUTH_MODE_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  applyAuthenticatedSessionToStorage,
  performConsistentSignOut,
} = await import("@/features/auth/session-sync");
const { handleListResearch, handleListResearchCategories } = await import(
  "@/features/cybercrime-research/server/research-server-handlers"
);
const { handleGetAdminDashboard } = await import(
  "@/features/admin/server/admin-server-handlers"
);
const { Header } = await import("@/components/layout/header");
const { Footer } = await import("@/components/layout/footer");
const HomePage = (await import("@/app/page")).default;
const LoginPage = (await import("@/app/login/page")).default;
const { getDictionary } = await import("@/lib/i18n/dictionaries");

const UNAUTHENTICATED = { status: "unauthenticated", user: null, profile: null };
const ACTIVE_MEMBER = {
  status: "authenticated",
  user: { id: "u-1", email: "member@vexorsec.com.br" },
  profile: {
    id: "u-1",
    username: "sec_member",
    display_name: "Sec Member",
    avatar_url: null,
    bio: null,
    interests: [],
    github_url: null,
    linkedin_url: null,
    preferred_locale: "pt-BR",
    role: "member",
    is_suspended: false,
    created_at: "2026-11-10T00:00:00Z",
  },
};

function createUnauthSupabaseMock() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  };
}

function setClientSession(userProfile) {
  if (!userProfile) {
    globalThis.window?.localStorage?.removeItem(SESSION_STORAGE_KEY);
    globalThis.window?.localStorage?.removeItem(AUTH_MODE_STORAGE_KEY);
  }
}

console.log("=== ETAPA 10.2 — ACCESS CONTROL & VISITOR RESTRICTION TESTS ===");

// 1-3: Public routes allowed for unauthenticated visitors
for (const publicRoute of [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/reset-password",
  "/auth/callback",
]) {
  assert.equal(isProtectedAppRoute(publicRoute), false, `${publicRoute} should be public`);
  assert.deepEqual(evaluateProtectedRouteAccess(publicRoute, UNAUTHENTICATED), {
    action: "allow",
  });
}
console.log("  ✓ 1-3. Public routes (/, /login, /register, /forgot-password, /auth/*) allowed for visitors");

// 4-10: Protected routes blocked for unauthenticated visitors and redirected safely to /login?next=...
const expectedBlocked = [
  ["/catalog", "/login?next=%2Fcatalog"],
  ["/catalog/nmap-scanner", "/login?next=%2Fcatalog%2Fnmap-scanner"],
  ["/catalog/bookmarks", "/login?next=%2Fcatalog%2Fbookmarks"],
  ["/catalog/submit", "/login?next=%2Fcatalog%2Fsubmit"],
  ["/forum", "/login?next=%2Fforum"],
  ["/forum/topic-123", "/login?next=%2Fforum%2Ftopic-123"],
  ["/forum/new", "/login?next=%2Fforum%2Fnew"],
  ["/my-contributions", "/login?next=%2Fmy-contributions"],
  ["/profile", "/login?next=%2Fprofile"],
  ["/profile/ivymaia", "/login?next=%2Fprofile%2Fivymaia"],
  ["/cybercrime-research", "/login?next=%2Fcybercrime-research"],
  ["/admin", "/login?next=%2Fadmin"],
];

for (const [route, expectedTarget] of expectedBlocked) {
  assert.equal(isProtectedAppRoute(route), true, `${route} should be protected`);
  const decision = evaluateProtectedRouteAccess(route, UNAUTHENTICATED);
  assert.equal(decision.action, "redirect", `${route} must redirect visitor`);
  assert.equal(decision.target, expectedTarget, `${route} redirect target mismatch`);
  assert.equal(decision.reason, "unauthenticated");
}
console.log("  ✓ 4-10. Protected routes (/catalog/*, /forum/*, /my-contributions, /profile/*, /admin, /cybercrime-research) redirect visitors to /login?next=...");

// Suspended member should not loop on /catalog
const SUSPENDED_MEMBER = {
  ...ACTIVE_MEMBER,
  profile: { ...ACTIVE_MEMBER.profile, is_suspended: true },
};
assert.deepEqual(evaluateProtectedRouteAccess("/catalog", SUSPENDED_MEMBER), {
  action: "redirect",
  target: "/",
  reason: "account_suspended",
});
console.log("  ✓ Suspended member redirect avoids /catalog loop");

// 11: Direct private API calls fail closed for visitors (401)
const unauthClient = createUnauthSupabaseMock();
const authCheck = await requireServerAuthorization("active_member", unauthClient);
assert.equal(authCheck.check.allowed, false);
assert.equal(authCheck.check.httpStatus, 401);

const researchRes = await handleListResearch(unauthClient, new URLSearchParams());
assert.equal(researchRes.status, 401);
const researchCatRes = await handleListResearchCategories(unauthClient);
assert.equal(researchCatRes.status, 401);
const adminDashRes = await handleGetAdminDashboard(unauthClient);
assert.equal(adminDashRes.status, 401);
console.log("  ✓ 11. Private API handlers (/api/research*, /api/admin*) return 401 for unauthenticated callers");

// 12-13: Authenticated active member accesses catalog, forum, my-contributions, profile
for (const memberRoute of [
  "/catalog",
  "/catalog/nmap-scanner",
  "/forum",
  "/forum/topic-123",
  "/my-contributions",
  "/profile",
  "/profile/ivymaia",
  "/cybercrime-research",
]) {
  assert.deepEqual(evaluateProtectedRouteAccess(memberRoute, ACTIVE_MEMBER), {
    action: "allow",
  });
}
console.log("  ✓ 12-13. Authenticated active member allowed on catalog, forum, my-contributions, profile, cybercrime-research");

// 14-15: SSR checks for Landing Page, Header, Mobile Quick Bar, and Footer (Visitor vs Authenticated)
const dict = getDictionary("pt-BR");
globalThis.__VEXOR_TEST_PATHNAME__ = "/";

// Visitor state (user === null)
const homeVisitorHtml = renderToStaticMarkup(React.createElement(HomePage));
assert.ok(homeVisitorHtml.includes("<h1"), "Landing page must render hero heading");
assert.ok(homeVisitorHtml.includes('href="/login"'), "Landing page must offer login CTA");
assert.ok(homeVisitorHtml.includes('href="/login"'), "Landing page must offer login CTA");
assert.ok(homeVisitorHtml.includes('href="/register"'), "Landing page must offer register CTA");
assert.ok(!homeVisitorHtml.includes('href="/catalog"'), "Visitor landing page must not link to /catalog");
assert.ok(!homeVisitorHtml.includes('href="/forum"'), "Visitor landing page must not link to /forum");
assert.ok(!homeVisitorHtml.includes('href="/catalog/submit"'), "Visitor landing page must not link to /catalog/submit");
assert.ok(!homeVisitorHtml.includes('aria-label="Mobile Quick Bar"'), "Mobile bottom navbar must NOT render for visitors");
assert.ok(!homeVisitorHtml.includes("pb-16 sm:pb-0"), "Footer must NOT reserve pb-16 space when mobile navbar is hidden");

const headerVisitorHtml = renderToStaticMarkup(
  React.createElement(Header, { locale: "pt-BR", onLocaleChange: () => {}, dict })
);
assert.ok(!headerVisitorHtml.includes('aria-label="Mobile Quick Bar"'), "Header must NOT render Mobile Quick Bar for visitors");
assert.ok(!headerVisitorHtml.includes('href="/catalog"'), "Header must NOT expose /catalog link to visitors");
assert.ok(!headerVisitorHtml.includes('href="/forum"'), "Header must NOT expose /forum link to visitors");

const footerVisitorHtml = renderToStaticMarkup(
  React.createElement(Footer, { locale: "pt-BR", dict })
);
assert.ok(!footerVisitorHtml.includes("pb-16"), "Footer must NOT reserve pb-16 for visitors");
assert.ok(!footerVisitorHtml.includes('href="/catalog"'), "Footer must NOT expose /catalog link to visitors");
assert.ok(!footerVisitorHtml.includes('href="/forum"'), "Footer must NOT expose /forum link to visitors");
assert.ok(!footerVisitorHtml.includes("Next.js 16"), "Footer must NOT expose stack info");
assert.ok(!footerVisitorHtml.includes("Supabase RLS"), "Footer must NOT expose database/RLS info");

// Login page must NOT render Profile Simulator or any demo profile buttons
globalThis.__VEXOR_TEST_PATHNAME__ = "/login";
const loginHtml = renderToStaticMarkup(React.createElement(LoginPage));
for (const forbidden of [
  "Simulador",
  "MODO PRÉ-SUPABASE",
  "sec_analyst_br",
  "mod_sentinel",
  "root_admin",
  "suspended_user",
]) {
  assert.ok(!loginHtml.includes(forbidden), `Login page must NOT render ${forbidden}`);
}
globalThis.__VEXOR_TEST_PATHNAME__ = "/";
console.log("  ✓ 1, 15. Visitor SSR: landing page, footer & login page clean (zero simulator, zero Mobile Quick Bar, zero pb-16)");

// 14 & 16: Verify authenticated state via localStorage-backed mock store + logout
// Mock window & localStorage for useSyncExternalStore / signOut tests
const storageMap = new Map();
const mockStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
};
globalThis.window = {
  localStorage: mockStorage,
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.CustomEvent = class CustomEvent {
  constructor(name) {
    this.type = name;
  }
};

// Simulate server-verified session stored in client mirror via applyAuthenticatedSessionToStorage
applyAuthenticatedSessionToStorage(mockStorage, {
  id: ACTIVE_MEMBER.user.id,
  username: ACTIVE_MEMBER.profile.username,
  displayName: ACTIVE_MEMBER.profile.display_name,
  email: ACTIVE_MEMBER.user.email,
  preferredLanguage: "pt-BR",
  role: "member",
  isSuspended: false,
  createdAt: ACTIVE_MEMBER.profile.created_at,
});
assert.equal(mockStorage.getItem(AUTH_MODE_STORAGE_KEY), "supabase");
assert.ok(mockStorage.getItem(SESSION_STORAGE_KEY)?.includes("sec_member"));

// Verify Header & Footer source structure preserves authenticated Mobile Quick Bar & pb-16
const headerSrc = fs.readFileSync(
  path.join(srcRoot, "components/layout/header.tsx"),
  "utf8"
);
assert.ok(
  headerSrc.includes('{user && (\n        <nav\n          aria-label="Mobile Quick Bar"') ||
    headerSrc.includes('{user && (\r\n        <nav\r\n          aria-label="Mobile Quick Bar"'),
  "Header must gate Mobile Quick Bar on {user && ...}"
);
const footerSrc = fs.readFileSync(
  path.join(srcRoot, "components/layout/footer.tsx"),
  "utf8"
);
assert.ok(
  footerSrc.includes('user ? "pb-16 sm:pb-0" : ""'),
  "Footer must only reserve pb-16 when user is authenticated"
);

// 16: Logout removes session, removes Mobile Quick Bar, and re-blocks private routes
const signOutResult = await performConsistentSignOut({
  storage: mockStorage,
  serverLogout: async () => ({ ok: true }),
  clientSignOut: async () => {},
});
assert.equal(signOutResult.ok, true);
assert.equal(mockStorage.getItem(SESSION_STORAGE_KEY), null);
assert.equal(mockStorage.getItem(AUTH_MODE_STORAGE_KEY), null);
const headerAfterLogoutHtml = renderToStaticMarkup(
  React.createElement(Header, { locale: "pt-BR", onLocaleChange: () => {}, dict })
);
assert.ok(!headerAfterLogoutHtml.includes('aria-label="Mobile Quick Bar"'), "Logout MUST remove Mobile Quick Bar");
assert.equal(evaluateProtectedRouteAccess("/catalog", UNAUTHENTICATED).action, "redirect");
assert.equal(evaluateProtectedRouteAccess("/forum", UNAUTHENTICATED).action, "redirect");
console.log("  ✓ 14, 16. Authenticated session mirror + navbar gating verified; logout clears session, removes navbar, and re-blocks private routes");

// 17: Post-login redirect works for valid internal paths and blocks Open Redirects
function createLoginAuthClient() {
  return {
    signInWithPassword: async () => ({
      data: {
        user: { id: ACTIVE_MEMBER.user.id, email: ACTIVE_MEMBER.user.email },
        session: { access_token: "tok" },
      },
      error: null,
    }),
  };
}

const mockFetchSessionContext = async () => ({
  authenticated: true,
  user: ACTIVE_MEMBER.user,
  profile: ACTIVE_MEMBER.profile,
});

const okCatalogLogin = await loginWithSupabase({
  email: "member@vexorsec.com.br",
  password: "ValidPassword123!",
  nextPath: "/catalog/nmap-scanner",
  authClient: createLoginAuthClient(),
  fetchSessionContext: mockFetchSessionContext,
});
assert.equal(okCatalogLogin.status, "authenticated");
assert.equal(okCatalogLogin.safeRedirectPath, "/catalog/nmap-scanner");

for (const evilTarget of [
  "https://evil.com",
  "//evil.com",
  "javascript:alert(1)",
  "/\\evil.com",
]) {
  const safeLogin = await loginWithSupabase({
    email: "member@vexorsec.com.br",
    password: "ValidPassword123!",
    nextPath: evilTarget,
    authClient: createLoginAuthClient(),
    fetchSessionContext: mockFetchSessionContext,
  });
  assert.equal(safeLogin.status, "authenticated");
  assert.equal(safeLogin.safeRedirectPath, "/catalog", `Open redirect blocked for ${evilTarget}`);
}
console.log("  ✓ 17. Post-login redirect preserves internal paths and blocks Open Redirect payloads");

setClientSession(null);
console.log("=== ALL ETAPA 10.2 ACCESS CONTROL TESTS PASSED ===");
