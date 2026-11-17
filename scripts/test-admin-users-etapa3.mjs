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

const MOCK_NEXT_LINK = `data:text/javascript,${encodeURIComponent(`
import React from ${JSON.stringify(import.meta.resolve("react"))};
export default function Link({ href, children, ...props }) {
  return React.createElement("a", { href: typeof href === "string" ? href : String(href), ...props }, children);
}
`)}`;

const MOCK_NEXT_NAVIGATION = `data:text/javascript,${encodeURIComponent(`
export function usePathname() { return "/admin/users"; }
export function redirect(url) { throw new Error("NEXT_REDIRECT:" + url); }
`)}`;

const MOCK_AUTH_STORE = `data:text/javascript,${encodeURIComponent(`
export const DEMO_PROFILES = [];
const state = {
  user: {
    id: "00000000-0000-0000-0000-000000000004",
    username: "vexor_admin",
    displayName: "Vexor Administrator",
    role: "admin",
    isSuspended: false,
    preferredLanguage: "pt-BR",
  },
  isAdmin: true,
  isModerator: true,
  isLoading: false,
  signOut: async () => {},
};
export function useAuthStore(selector) {
  return typeof selector === "function" ? selector(state) : state;
}
`)}`;

const MOCK_I18N_CONTEXT = `data:text/javascript,${encodeURIComponent(`
import { getDictionary } from ${JSON.stringify(pathToFileURL(path.join(srcRoot, "lib/i18n/dictionaries.ts")).href)};
export function useI18n() {
  const locale = globalThis.__VEXOR_TEST_LOCALE__ || "pt-BR";
  return {
    locale,
    dict: getDictionary(locale),
    setLocale: () => {},
  };
}
`)}`;

function resolveTsPath(candidate) {
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return pathToFileURL(candidate).href;
  }
  for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
    if (fs.existsSync(candidate + ext)) {
      return pathToFileURL(candidate + ext).href;
    }
  }
  for (const indexFile of ["index.ts", "index.tsx", "index.js"]) {
    const joined = path.join(candidate, indexFile);
    if (fs.existsSync(joined)) {
      return pathToFileURL(joined).href;
    }
  }
  return candidate;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/link") {
      return { url: MOCK_NEXT_LINK, shortCircuit: true };
    }
    if (specifier === "next/navigation") {
      return { url: MOCK_NEXT_NAVIGATION, shortCircuit: true };
    }
    if (specifier === "@/features/auth/use-auth-store") {
      return { url: MOCK_AUTH_STORE, shortCircuit: true };
    }
    if (specifier === "@/lib/i18n/context") {
      return { url: MOCK_I18N_CONTEXT, shortCircuit: true };
    }

    let mapped = specifier;
    if (specifier.startsWith("@/")) {
      mapped = resolveTsPath(path.join(srcRoot, specifier.slice(2)));
    } else if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith("file:") &&
      !context.parentURL.includes("node_modules")
    ) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      mapped = resolveTsPath(path.resolve(parentDir, specifier));
    }

    return nextResolve(mapped, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && url.endsWith(".tsx")) {
      const filePath = fileURLToPath(url);
      const source = fs.readFileSync(filePath, "utf8");
      const transpiled = ts.transpileModule(source, {
        fileName: filePath,
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
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

console.log("=== VEXOR ETAPA 3 — ADMIN USERS MANAGEMENT TEST SUITE ===");

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");

const { createSimulatedAdminProvider } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/services/admin-provider.ts")).href
);
const { default: AdminUsersPage } = await import(
  pathToFileURL(path.join(srcRoot, "app/admin/users/page.tsx")).href
);
const { AdminUserDetailModal } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/components/admin-user-detail-modal.tsx")).href
);

const provider = createSimulatedAdminProvider();

// 1. User listing
const allUsers = await provider.users.listUsers({}, { page: 1, pageSize: 20 });
assert.ok(allUsers.total >= 5);
assert.equal(allUsers.isSimulatedDemoData, true);
assert.equal(
  allUsers.items.every((u) => !("email" in u)),
  true
);

// 2. Search by name
const byName = await provider.users.listUsers({ query: "Marina Costa" });
assert.equal(byName.total, 1);
assert.equal(byName.items[0].username, "dfir_marina");

// 3. Search by username
const byUsername = await provider.users.listUsers({ query: "cve_hunter" });
assert.equal(byUsername.total, 1);
assert.equal(byUsername.items[0].displayName, "Lucas Ferreira");

// 4. Filter by role
const mods = await provider.users.listUsers({ role: "moderator" });
assert.ok(mods.total >= 1);
assert.equal(mods.items.every((u) => u.role === "moderator"), true);

// 5. Filter by status
const suspended = await provider.users.listUsers({ status: "suspended" });
assert.ok(suspended.total >= 1);
assert.equal(suspended.items.every((u) => u.isSuspended === true), true);

// 6. Combined filters (role + status + query + period)
const combined = await provider.users.listUsers({
  role: "member",
  status: "active",
  query: "Daniela",
  period: "30d",
});
assert.equal(combined.total, 1);
assert.equal(combined.items[0].username, "cloud_auditor");

// 7. Clear filters restores full count
const cleared = await provider.users.listUsers({
  role: "all",
  status: "all",
  period: "all",
  query: "",
});
assert.equal(cleared.total, allUsers.total);

// 8. Pagination & boundary clamping
const page1 = await provider.users.listUsers({}, { page: 1, pageSize: 3 });
const page2 = await provider.users.listUsers({}, { page: 2, pageSize: 3 });
const outOfBounds = await provider.users.listUsers({}, { page: 999, pageSize: 3 });
assert.equal(page1.items.length, 3);
assert.equal(page1.page, 1);
assert.ok(page1.totalPages >= 2);
assert.notEqual(page1.items[0].id, page2.items[0].id);
assert.equal(outOfBounds.page, outOfBounds.totalPages);

// 9. Individual lookup
const singleUser = await provider.users.getUserById("00000000-0000-0000-0000-000000000001");
assert.ok(singleUser);
assert.equal(singleUser.username, "sec_analyst_br");

// 10. Non-existent user
const missingUser = await provider.users.getUserById("00000000-0000-0000-0000-999999999999");
assert.equal(missingUser, null);

// 11. Summary statistics
const summary = await provider.users.getUsersSummary();
assert.equal(summary.isSimulatedDemoData, true);
assert.equal(summary.totalUsers, allUsers.total);
assert.equal(summary.activeUsers + summary.suspendedUsers, summary.totalUsers);
assert.ok(summary.adminUsers >= 1);
assert.ok(summary.moderatorUsers >= 1);
console.log("  ✓ Service listing, search, filters, pagination, lookup, and summary checks passed");

// 12. SSR render of AdminUsersPage & AdminUserDetailModal in PT-BR and EN
for (const locale of ["pt-BR", "en"]) {
  globalThis.__VEXOR_TEST_LOCALE__ = locale;
  const pageHtml = renderToStaticMarkup(React.createElement(AdminUsersPage));
  assert.match(
    pageHtml,
    locale === "pt-BR" ? /Gerenciamento de usuários/ : /User Management/
  );
  assert.match(
    pageHtml,
    locale === "pt-BR" ? /DADOS DEMONSTRATIVOS/ : /SIMULATED DATA/
  );
  assert.match(
    pageHtml,
    locale === "pt-BR" ? /Atualizar dados/ : /Refresh data/
  );

  const modalHtml = renderToStaticMarkup(
    React.createElement(AdminUserDetailModal, {
      userId: "00000000-0000-0000-0000-000000000001",
      currentAdminId: "00000000-0000-0000-0000-000000000004",
      onClose: () => {},
    })
  );
  assert.match(modalHtml, /role="dialog"/);
  assert.match(modalHtml, /aria-modal="true"/);
}
console.log("  ✓ SSR rendering in PT-BR and EN verified");

// 13, 14, 15. Static security & architecture checks
const uiFiles = [
  "src/app/admin/users/page.tsx",
  "src/features/admin/components/admin-user-detail-modal.tsx",
];

for (const relPath of uiFiles) {
  const code = fs.readFileSync(path.join(rootDir, relPath), "utf8");
  assert.equal(code.includes("simulated-admin-data"), false, `${relPath} must not import simulated-admin-data`);
  assert.equal(code.includes("localStorage"), false, `${relPath} must not use localStorage`);
  assert.equal(code.includes("admin-service"), false, `${relPath} must not use legacy adminService`);
  assert.equal(code.includes("@/lib/supabase/client"), false, `${relPath} must not write to Supabase`);
  assert.equal(code.includes("service_role"), false, `${relPath} must not reference service_role`);
}

const pageCode = fs.readFileSync(path.join(rootDir, "src/app/admin/users/page.tsx"), "utf8");
assert.match(pageCode, /<AdminGuard requireAdmin=\{true\}>/);
assert.match(pageCode, /adminDataProvider\.users\.listUsers/);
assert.match(pageCode, /adminDataProvider\.users\.getUsersSummary/);

const layoutCode = fs.readFileSync(path.join(rootDir, "src/app/admin/users/layout.tsx"), "utf8");
assert.match(layoutCode, /requireServerAuthorization\("admin"\)/);
console.log("  ✓ Security, isolation, and server authorization checks passed");

console.log("ALL ETAPA 3 ADMIN USERS CHECKS PASSED.");
