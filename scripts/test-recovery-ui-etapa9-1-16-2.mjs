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

const uiMockState = {
  searchParams: new Map(),
};
globalThis.__VEXOR_RECOVERY_UI_MOCK__ = uiMockState;

const MOCK_NAV_URL = pathToFileURL(path.join(rootDir, "__vexor_mock__/next-nav-rec.mjs")).href;
const MOCK_HEADER_URL = pathToFileURL(path.join(rootDir, "__vexor_mock__/header-rec.mjs")).href;
const MOCK_FOOTER_URL = pathToFileURL(path.join(rootDir, "__vexor_mock__/footer-rec.mjs")).href;
const MOCK_CATALOG_URL = pathToFileURL(path.join(rootDir, "__vexor_mock__/catalog-store-rec.mjs")).href;
const MOCK_AUTH_STORE_URL = pathToFileURL(path.join(rootDir, "__vexor_mock__/auth-store-rec.mjs")).href;
const MOCK_IMAGE_URL = pathToFileURL(path.join(rootDir, "__vexor_mock__/next-image-rec.mjs")).href;
const MOCK_LINK_URL = pathToFileURL(path.join(rootDir, "__vexor_mock__/next-link-rec.mjs")).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/navigation") return { url: MOCK_NAV_URL, shortCircuit: true };
    if (specifier === "next/image") return { url: MOCK_IMAGE_URL, shortCircuit: true };
    if (specifier === "next/link") return { url: MOCK_LINK_URL, shortCircuit: true };
    if (specifier === "@/components/layout/header") return { url: MOCK_HEADER_URL, shortCircuit: true };
    if (specifier === "@/components/layout/footer") return { url: MOCK_FOOTER_URL, shortCircuit: true };
    if (specifier === "@/features/catalog/use-catalog-store") return { url: MOCK_CATALOG_URL, shortCircuit: true };
    if (specifier === "@/features/auth/use-auth-store") return { url: MOCK_AUTH_STORE_URL, shortCircuit: true };

    let mapped = specifier;
    if (specifier.startsWith("@/")) {
      const candidate = path.join(srcRoot, specifier.slice(2));
      if (fs.existsSync(candidate + ".ts")) mapped = pathToFileURL(candidate + ".ts").href;
      else if (fs.existsSync(candidate + ".tsx")) mapped = pathToFileURL(candidate + ".tsx").href;
    } else if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !path.extname(specifier) &&
      context.parentURL?.startsWith("file:")
    ) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const candidate = path.resolve(parentDir, specifier);
      if (fs.existsSync(candidate + ".ts")) mapped = pathToFileURL(candidate + ".ts").href;
      else if (fs.existsSync(candidate + ".tsx")) mapped = pathToFileURL(candidate + ".tsx").href;
    }
    return nextResolve(mapped, context);
  },
  load(url, context, nextLoad) {
    if (url === MOCK_NAV_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export function useSearchParams() {
            return {
              get: (k) => globalThis.__VEXOR_RECOVERY_UI_MOCK__.searchParams.get(k) ?? null,
            };
          }
        `,
      };
    }
    if (url === MOCK_IMAGE_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `import React from "react"; export default function Image(props) { return React.createElement("img", { alt: props.alt }); }`,
      };
    }
    if (url === MOCK_LINK_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `import React from "react"; export default function Link({ href, children, ...rest }) { return React.createElement("a", { href, ...rest }, children); }`,
      };
    }
    if (url === MOCK_HEADER_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `import React from "react"; export function Header() { return React.createElement("header"); }`,
      };
    }
    if (url === MOCK_FOOTER_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `import React from "react"; export function Footer() { return React.createElement("footer"); }`,
      };
    }
    if (url === MOCK_CATALOG_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `export function useCatalogStore() { return { locale: "pt-BR", setLocale: () => {} }; }`,
      };
    }
    if (url === MOCK_AUTH_STORE_URL) {
      return {
        format: "module",
        shortCircuit: true,
        source: `export function useAuthStore() { return { refreshSession: async () => ({}) }; }`,
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
      return { format: "module", shortCircuit: true, source: transpiled.outputText };
    }
    return nextLoad(url, context);
  },
});

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const { default: ForgotPasswordPage } = await import("../src/app/forgot-password/page.tsx");
const { default: AuthResetPasswordPage } = await import("../src/app/auth/reset-password/page.tsx");
const { getDictionary } = await import("../src/lib/i18n/dictionaries.ts");

console.log("=== ETAPA 9.1.16.2 — REACT SSR RENDER CHECKS (NO JSDOM INSTALLED) ===");

const dict = getDictionary("pt-BR");

// 1. ForgotPasswordPage renders recovery email form without simulation notice
{
  const html = renderToStaticMarkup(React.createElement(ForgotPasswordPage));
  assert.ok(html.includes('id="recovery-email"'));
  assert.ok(html.includes(dict.auth.forgotPasswordPage.submitButton));
  assert.equal(html.includes(dict.auth.forgotPasswordPage.simulationLinkCta), false);
  console.log("  ✓ ForgotPasswordPage SSR render check passed");
}

// 2. AuthResetPasswordPage blocks form immediately when ?error=recovery_link_invalid
{
  uiMockState.searchParams.set("error", "recovery_link_invalid");
  const invalidHtml = renderToStaticMarkup(React.createElement(AuthResetPasswordPage));
  assert.ok(invalidHtml.includes('role="alert"'));
  assert.ok(invalidHtml.includes(dict.auth.resetPasswordPage.invalidSessionTitle));
  assert.equal(invalidHtml.includes('id="new-password"'), false);

  // Without error param, initial SSR state is "checking" (form still not exposed)
  uiMockState.searchParams.delete("error");
  const checkingHtml = renderToStaticMarkup(React.createElement(AuthResetPasswordPage));
  assert.ok(checkingHtml.includes(dict.auth.resetPasswordPage.verifyingSession));
  assert.equal(checkingHtml.includes('id="new-password"'), false);

  console.log("  ✓ AuthResetPasswordPage SSR gate check passed (form hidden when invalid or checking)");
}
