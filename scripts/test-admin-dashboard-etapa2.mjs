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

let activeLocale = "pt-BR";

const MOCK_NEXT_LINK = `data:text/javascript,${encodeURIComponent(`
import React from ${JSON.stringify(import.meta.resolve("react"))};
export default function Link({ href, children, ...props }) {
  return React.createElement("a", { href: typeof href === "string" ? href : String(href), ...props }, children);
}
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

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/link") {
      return { url: MOCK_NEXT_LINK, shortCircuit: true };
    }
    if (specifier === "@/features/auth/use-auth-store") {
      return { url: MOCK_AUTH_STORE, shortCircuit: true };
    }
    if (specifier === "@/lib/i18n/context") {
      return { url: MOCK_I18N_CONTEXT, shortCircuit: true };
    }

    let mapped = specifier;
    if (specifier.startsWith("@/")) {
      const candidate = path.join(srcRoot, specifier.slice(2));
      mapped = resolveTsPath(candidate);
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

console.log("=== VEXOR ETAPA 2 — ADMIN DASHBOARD TEST SUITE ===");

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");

const { createSimulatedAdminProvider } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/services/admin-provider.ts")).href
);
const { default: AdminDashboardPage } = await import(
  pathToFileURL(path.join(srcRoot, "app/admin/page.tsx")).href
);
const { AdminMetricsGrid } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/components/admin-metrics-grid.tsx")).href
);
const { AdminRecentActivity } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/components/admin-recent-activity.tsx")).href
);
const { AdminModerationPreview } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/components/admin-moderation-preview.tsx")).href
);
const { AdminReportsPreview } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/components/admin-reports-preview.tsx")).href
);
const { AdminPendingResourcesPreview } = await import(
  pathToFileURL(path.join(srcRoot, "features/admin/components/admin-pending-resources-preview.tsx")).href
);

// 1. Simulated provider contract & stats consistency
const provider = createSimulatedAdminProvider();
assert.equal(provider.isSimulated, true);
const stats = await provider.dashboard.getDashboardStats();
assert.equal(stats.isSimulatedDemoData, true);
assert.equal(
  stats.totalPublications,
  stats.publishedResources + stats.totalTopics + stats.totalPosts
);
assert.ok(stats.totalUsers >= 5);
assert.ok(stats.pendingModerationItems >= 1);

const auditRes = await provider.audit.listAuditEntries({}, { page: 1, pageSize: 5 });
const queueRes = await provider.moderation.listQueue({}, { page: 1, pageSize: 10 });
const reportsRes = await provider.reports.listReports({}, { page: 1, pageSize: 10 });
const resourcesRes = await provider.resources.listResources(
  { status: "pending" },
  { page: 1, pageSize: 5 }
);
console.log("  ✓ Simulated provider dashboard, audit, moderation, reports, and resources data verified");

// 2. Render Dashboard page & components in PT-BR and EN
for (const locale of ["pt-BR", "en"]) {
  activeLocale = locale;
  globalThis.__VEXOR_TEST_LOCALE__ = activeLocale;

  const pageHtml = renderToStaticMarkup(React.createElement(AdminDashboardPage));
  assert.match(pageHtml, /Dashboard/);
  assert.match(pageHtml, /Vexor Administrator/);
  assert.match(
    pageHtml,
    locale === "pt-BR" ? /DADOS DEMONSTRATIVOS/ : /SIMULATED DATA/
  );
  assert.match(
    pageHtml,
    locale === "pt-BR" ? /Atualizar dados/ : /Refresh data/
  );

  const metricsHtml = renderToStaticMarkup(
    React.createElement(AdminMetricsGrid, { stats, loading: false })
  );
  assert.match(metricsHtml, /href="\/admin\/users"/);
  assert.match(metricsHtml, /href="\/admin\/catalog"/);
  assert.match(metricsHtml, /href="\/admin\/reports"/);
  assert.match(metricsHtml, /href="\/admin\/moderation"/);
  assert.equal(metricsHtml.includes("+15%"), false);
  assert.equal(metricsHtml.includes("+20%"), false);

  const activityHtml = renderToStaticMarkup(
    React.createElement(AdminRecentActivity, {
      entries: auditRes.items,
      loading: false,
    })
  );
  assert.match(activityHtml, /href="\/admin\/audit"/);
  assert.match(activityHtml, /@vexor_admin/);

  const modHtml = renderToStaticMarkup(
    React.createElement(AdminModerationPreview, {
      items: queueRes.items.filter((i) => i.status === "pending"),
      loading: false,
    })
  );
  assert.match(modHtml, /href="\/admin\/moderation"/);
  assert.doesNotMatch(modHtml, /Aprovar e Publicar|Approve &amp; Publish/);

  const reportsHtml = renderToStaticMarkup(
    React.createElement(AdminReportsPreview, {
      reports: reportsRes.items,
      pendingCount: stats.openReports,
      loading: false,
    })
  );
  assert.match(reportsHtml, /href="\/admin\/reports"/);
  assert.doesNotMatch(reportsHtml, /sec_analyst_br|cve_hunter/);

  const resourcesHtml = renderToStaticMarkup(
    React.createElement(AdminPendingResourcesPreview, {
      resources: resourcesRes.items,
      loading: false,
    })
  );
  assert.match(resourcesHtml, /href="\/admin\/catalog"/);
}
console.log("  ✓ All dashboard components rendered cleanly in PT-BR and EN with zero private reporter leakage");

// 3. Loading and empty states
globalThis.__VEXOR_TEST_LOCALE__ = "pt-BR";
const loadingMetricsHtml = renderToStaticMarkup(
  React.createElement(AdminMetricsGrid, { stats: null, loading: true })
);
assert.match(loadingMetricsHtml, /animate-pulse/);

const emptyActivityHtml = renderToStaticMarkup(
  React.createElement(AdminRecentActivity, { entries: [], loading: false })
);
assert.match(emptyActivityHtml, /Nenhum evento administrativo registrado/);

const emptyModHtml = renderToStaticMarkup(
  React.createElement(AdminModerationPreview, { items: [], loading: false })
);
assert.match(emptyModHtml, /Nenhum item pendente na fila de moderação/);
console.log("  ✓ Loading and empty UI states rendered as expected");

// 4. Static security & architecture checks
const dashboardFiles = [
  "src/app/admin/page.tsx",
  "src/features/admin/components/admin-metrics-grid.tsx",
  "src/features/admin/components/admin-recent-activity.tsx",
  "src/features/admin/components/admin-moderation-preview.tsx",
  "src/features/admin/components/admin-reports-preview.tsx",
  "src/features/admin/components/admin-pending-resources-preview.tsx",
];

for (const relPath of dashboardFiles) {
  const code = fs.readFileSync(path.join(rootDir, relPath), "utf8");
  assert.equal(
    code.includes("simulated-admin-data"),
    false,
    `${relPath} must not import simulated-admin-data directly`
  );
  assert.equal(
    code.includes("localStorage"),
    false,
    `${relPath} must not use localStorage`
  );
  assert.equal(
    code.includes("admin-service"),
    false,
    `${relPath} must use adminDataProvider instead of legacy adminService`
  );
}

const pageCode = fs.readFileSync(path.join(rootDir, "src/app/admin/page.tsx"), "utf8");
assert.match(pageCode, /adminDataProvider/);
assert.match(pageCode, /role="alert"/);
assert.match(pageCode, /loadError/);

const layoutCode = fs.readFileSync(path.join(rootDir, "src/app/admin/layout.tsx"), "utf8");
assert.match(layoutCode, /requireServerAuthorization\("moderator"\)/);

const sidebarCode = fs.readFileSync(
  path.join(rootDir, "src/features/admin/components/admin-sidebar.tsx"),
  "utf8"
);
for (const route of [
  "/admin",
  "/admin/moderation",
  "/admin/catalog",
  "/admin/forum",
  "/admin/research",
  "/admin/reports",
  "/admin/users",
  "/admin/audit",
]) {
  assert.ok(sidebarCode.includes(`"${route}"`), `Sidebar missing route ${route}`);
}
console.log("  ✓ Architecture, server authorization, error state, and navigation links verified");

console.log("ALL ETAPA 2 ADMIN DASHBOARD CHECKS PASSED.");
