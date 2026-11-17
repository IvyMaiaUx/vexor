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

// Shared mutable runtime test state accessed by mocked modules inside registerHooks
const runtimeState = {
  mockSupabase: null,
  throwCreateClient: false,
  storeState: {
    signOutError: false,
    isSigningOut: false,
    onSignOut: () => {},
  },
};
globalThis.__VEXOR_RUNTIME_TEST_STATE__ = runtimeState;

const MOCK_SERVER_URL = pathToFileURL(path.join(rootDir, "__vexor_mock__/supabase-server.mjs")).href;
const MOCK_NAV_URL = pathToFileURL(path.join(rootDir, "__vexor_mock__/next-navigation.mjs")).href;
const MOCK_USE_AUTH_STORE_URL = pathToFileURL(path.join(rootDir, "__vexor_mock__/use-auth-store.mjs")).href;
const MOCK_ADMIN_SHELL_URL = pathToFileURL(path.join(rootDir, "__vexor_mock__/admin-layout-shell.mjs")).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase/server") {
      return { url: MOCK_SERVER_URL, shortCircuit: true };
    }
    if (specifier === "next/navigation") {
      return { url: MOCK_NAV_URL, shortCircuit: true };
    }
    if (specifier === "@/features/auth/use-auth-store") {
      return { url: MOCK_USE_AUTH_STORE_URL, shortCircuit: true };
    }
    if (specifier === "@/features/admin/components/admin-layout-shell") {
      return { url: MOCK_ADMIN_SHELL_URL, shortCircuit: true };
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
            const state = globalThis.__VEXOR_RUNTIME_TEST_STATE__;
            if (state.throwCreateClient) {
              throw new Error("Sensitive internal DB DSN: postgres://user:secret@db:5432");
            }
            return state.mockSupabase;
          }
        `,
      };
    }

    if (url === MOCK_NAV_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export function redirect(target) {
            const err = new Error("NEXT_REDIRECT:" + target);
            err.digest = "NEXT_REDIRECT;" + target;
            err.redirectTarget = target;
            throw err;
          }
        `,
      };
    }

    if (url === MOCK_USE_AUTH_STORE_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export function useAuthStore(selector) {
            const s = globalThis.__VEXOR_RUNTIME_TEST_STATE__.storeState;
            const state = {
              signOutError: s.signOutError,
              isSigningOut: s.isSigningOut,
              signOut: () => s.onSignOut(),
            };
            return selector ? selector(state) : state;
          }
        `,
      };
    }

    if (url === MOCK_ADMIN_SHELL_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          import React from "react";
          export function AdminLayoutShell({ children }) {
            return React.createElement("div", { "data-testid": "admin-shell" }, children);
          }
        `,
      };
    }

    if (url.startsWith("file:") && url.endsWith(".tsx")) {
      const filePath = fileURLToPath(url);
      const source = fs.readFileSync(filePath, "utf8");
      const transpiled = ts.transpileModule(source, {
        fileName: filePath,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
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

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");

const { POST: logoutPost } = await import("../src/app/api/auth/logout/route.ts");
const { default: AdminLayout } = await import("../src/app/admin/layout.tsx");
const { default: AdminUsersLayout } = await import("../src/app/admin/users/layout.tsx");
const { default: AdminAuditLayout } = await import("../src/app/admin/audit/layout.tsx");
const { default: CybercrimeResearchLayout } = await import(
  "../src/app/cybercrime-research/layout.tsx"
);
const { SignOutErrorBanner } = await import("../src/components/auth/sign-out-error-banner.tsx");
const { getDictionary } = await import("../src/lib/i18n/dictionaries.ts");
const {
  syncClientSessionFromServer,
  performConsistentSignOut,
  resetSyncCoordinatorForTests,
  readSyncMeta,
} = await import("../src/features/auth/session-sync.ts");

function makeMockSupabase({ user = null, profile = null, signOutError = null, throwSignOut = false, throwAuth = false } = {}) {
  let signOutCalled = 0;
  return {
    get signOutCalls() {
      return signOutCalled;
    },
    auth: {
      async getUser() {
        if (throwAuth) {
          throw new Error("Supabase unreachable");
        }
        return { data: { user }, error: null };
      },
      async signOut() {
        signOutCalled += 1;
        if (throwSignOut) {
          throw new Error("Internal socket hang up 10.0.0.5:5432");
        }
        return { error: signOutError };
      },
    },
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: profile, error: null };
                },
              };
            },
          };
        },
      };
    },
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

async function expectRedirect(fn, expectedTarget) {
  let caught = null;
  try {
    await fn();
  } catch (err) {
    caught = err;
  }
  assert.ok(caught, `Expected redirect to ${expectedTarget}, but component rendered normally`);
  assert.equal(caught.redirectTarget, expectedTarget);
}

console.log("=== ETAPA 9.1.15.2.2 — RUNTIME LAYOUT, LOGOUT ROUTE & BANNER TESTS ===");

// 1. Real execution of POST /api/auth/logout
{
  const okClient = makeMockSupabase();
  runtimeState.throwCreateClient = false;
  runtimeState.mockSupabase = okClient;
  const okRes = await logoutPost();
  assert.equal(okRes.status, 200);
  assert.equal(okRes.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await okRes.json(), { ok: true });
  assert.equal(okClient.signOutCalls, 1);

  const errClient = makeMockSupabase({
    signOutError: { message: "JWT secret mismatch internal details" },
  });
  runtimeState.mockSupabase = errClient;
  const errRes = await logoutPost();
  const errBody = await errRes.json();
  assert.equal(errRes.status, 500);
  assert.equal(errRes.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(errBody, { ok: false, error: "logout_failed" });
  assert.equal(JSON.stringify(errBody).includes("JWT secret"), false);

  runtimeState.throwCreateClient = true;
  const crashRes = await logoutPost();
  const crashBody = await crashRes.json();
  assert.equal(crashRes.status, 500);
  assert.equal(crashRes.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(crashBody, { ok: false, error: "logout_failed" });
  assert.equal(JSON.stringify(crashBody).includes("postgres://"), false);
  runtimeState.throwCreateClient = false;

  console.log("  ✓ Runtime Test A passed (POST /api/auth/logout real execution, HTTP status, no-store, zero secret leakage)");
}

// 2. Real execution of AdminLayout, AdminUsersLayout, AdminAuditLayout & CybercrimeResearchLayout
{
  const child = React.createElement("span", null, "protected-content");

  // Unauthenticated
  runtimeState.mockSupabase = makeMockSupabase({ user: null });
  await expectRedirect(() => AdminLayout({ children: child }), "/login?next=%2Fadmin");
  await expectRedirect(() => AdminUsersLayout({ children: child }), "/login?next=%2Fadmin%2Fusers");
  await expectRedirect(() => AdminAuditLayout({ children: child }), "/login?next=%2Fadmin%2Faudit");
  await expectRedirect(
    () => CybercrimeResearchLayout({ children: child }),
    "/login?next=%2Fcybercrime-research"
  );

  // Active member: allowed on CybercrimeResearchLayout, blocked on AdminLayout
  runtimeState.mockSupabase = makeMockSupabase({
    user: { id: "u1", email: "member@vexor.test" },
    profile: sampleProfile({ id: "u1", role: "member", is_suspended: false }),
  });
  await expectRedirect(() => AdminLayout({ children: child }), "/catalog");
  const researchTree = await CybercrimeResearchLayout({ children: child });
  assert.ok(renderToStaticMarkup(researchTree).includes("protected-content"));

  // Suspended member: blocked on CybercrimeResearchLayout
  runtimeState.mockSupabase = makeMockSupabase({
    user: { id: "u1", email: "member@vexor.test" },
    profile: sampleProfile({ id: "u1", role: "member", is_suspended: true }),
  });
  await expectRedirect(() => CybercrimeResearchLayout({ children: child }), "/catalog");

  // Connection error: blocked on CybercrimeResearchLayout and AdminLayout (fail-closed)
  runtimeState.mockSupabase = makeMockSupabase({ throwAuth: true });
  await expectRedirect(() => CybercrimeResearchLayout({ children: child }), "/catalog");
  await expectRedirect(() => AdminLayout({ children: child }), "/catalog");

  // Moderator: allowed on AdminLayout, blocked on AdminUsersLayout & AdminAuditLayout
  runtimeState.mockSupabase = makeMockSupabase({
    user: { id: "u2", email: "mod@vexor.test" },
    profile: sampleProfile({ id: "u2", role: "moderator", is_suspended: false }),
  });
  const adminModTree = await AdminLayout({ children: child });
  assert.ok(renderToStaticMarkup(adminModTree).includes("protected-content"));
  await expectRedirect(() => AdminUsersLayout({ children: child }), "/admin");
  await expectRedirect(() => AdminAuditLayout({ children: child }), "/admin");

  // Admin: allowed on AdminUsersLayout & AdminAuditLayout
  runtimeState.mockSupabase = makeMockSupabase({
    user: { id: "u3", email: "admin@vexor.test" },
    profile: sampleProfile({ id: "u3", role: "admin", is_suspended: false }),
  });
  assert.ok(renderToStaticMarkup(await AdminUsersLayout({ children: child })).includes("protected-content"));
  assert.ok(renderToStaticMarkup(await AdminAuditLayout({ children: child })).includes("protected-content"));

  console.log("  ✓ Runtime Test B passed (Admin & CybercrimeResearch Server Component layouts executed directly)");
}

// 3. Real behavioral test of SignOutErrorBanner integrated with session-sync.ts
{
  resetSyncCoordinatorForTests();
  const map = new Map();
  const storage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };

  const syncBannerStateFromStorage = () => {
    const meta = readSyncMeta(storage);
    runtimeState.storeState.signOutError = meta.signOutError;
    runtimeState.storeState.isSigningOut = meta.isSigningOut;
  };

  const dict = getDictionary("pt-BR");

  // Initial state: no signOutError -> banner returns null
  syncBannerStateFromStorage();
  assert.equal(SignOutErrorBanner({ dict }), null);
  assert.equal(renderToStaticMarkup(React.createElement(SignOutErrorBanner, { dict })), "");

  // Simulate failed signOut
  await performConsistentSignOut({
    storage,
    onNotify: syncBannerStateFromStorage,
    serverLogout: async () => ({ ok: false }),
    clientSignOut: async () => {},
  });
  syncBannerStateFromStorage();

  // Banner must render with role="alert", i18n message, and enabled retry button
  const bannerTree = SignOutErrorBanner({ dict });
  assert.ok(bannerTree);
  assert.equal(bannerTree.props.role, "alert");
  const markup = renderToStaticMarkup(React.createElement(SignOutErrorBanner, { dict }));
  assert.ok(markup.includes(dict.auth.errors.logoutFailed));
  assert.ok(markup.includes(dict.auth.retrySignOut));

  // Automatic sync (focus/visibility/connection_error) MUST preserve signOutError and keep banner visible
  await syncClientSessionFromServer({
    storage,
    onNotify: syncBannerStateFromStorage,
    async fetchSession() {
      throw new Error("Network down during focus sync");
    },
  });
  syncBannerStateFromStorage();
  assert.equal(readSyncMeta(storage).signOutError, true);
  assert.ok(renderToStaticMarkup(React.createElement(SignOutErrorBanner, { dict })).includes('role="alert"'));

  // Extract button element from bannerTree and click it while retry is in flight
  let resolveRetry;
  const retryPromise = new Promise((r) => {
    resolveRetry = r;
  });
  let retryInvocations = 0;
  let activeRetryPromise = null;
  runtimeState.storeState.onSignOut = () => {
    retryInvocations += 1;
    activeRetryPromise = performConsistentSignOut({
      storage,
      onNotify: syncBannerStateFromStorage,
      serverLogout: async () => {
        await retryPromise;
        return { ok: true };
      },
      clientSignOut: async () => {},
    });
  };

  const innerDiv = bannerTree.props.children;
  const buttonEl = innerDiv.props.children[1];
  assert.equal(buttonEl.type, "button");
  assert.equal(buttonEl.props.disabled, false);

  // Trigger retry click
  buttonEl.props.onClick();
  assert.equal(retryInvocations, 1);
  syncBannerStateFromStorage();
  assert.equal(runtimeState.storeState.isSigningOut, true);

  // While retry is in flight, button must be disabled
  const inFlightTree = SignOutErrorBanner({ dict });
  const inFlightButton = inFlightTree.props.children.props.children[1];
  assert.equal(inFlightButton.props.disabled, true);

  // Complete retry successfully -> banner must disappear
  resolveRetry();
  await activeRetryPromise;
  syncBannerStateFromStorage();
  assert.equal(readSyncMeta(storage).signOutError, false);
  assert.equal(SignOutErrorBanner({ dict }), null);
  assert.equal(renderToStaticMarkup(React.createElement(SignOutErrorBanner, { dict })), "");

  console.log("  ✓ Runtime Test C passed (SignOutErrorBanner real React behavior, role=alert, retry, loading disabled, preservation across auto-sync)");
}

console.log("=== ALL RUNTIME UI, LAYOUT & LOGOUT ROUTE TESTS PASSED ===");
