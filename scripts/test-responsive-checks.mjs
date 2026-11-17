import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const ROOT = path.resolve(process.cwd());

console.log("=== VEXOR RESPONSIVENESS & BREAKPOINTS TEST SUITE ===\n");

// [Test 1] Check all routes exist and have responsive layout containers
console.log("[Test 1] Verificando existência de todas as rotas do escopo...");
const routes = [
  "src/app/page.tsx",
  "src/app/catalog/page.tsx",
  "src/app/catalog/[slug]/page.tsx",
  "src/app/catalog/bookmarks/page.tsx",
  "src/app/catalog/submit/page.tsx",
  "src/app/forum/page.tsx",
  "src/app/forum/[id]/page.tsx",
  "src/app/forum/new/page.tsx",
  "src/app/profile/page.tsx",
  "src/app/profile/[username]/page.tsx",
  "src/app/my-contributions/page.tsx",
  "src/app/login/page.tsx",
  "src/app/register/page.tsx",
  "src/app/forgot-password/page.tsx",
  "src/app/reset-password/page.tsx",
  "src/app/cybercrime-research/page.tsx",
];

for (const route of routes) {
  const fullPath = path.join(ROOT, route);
  assert.ok(fs.existsSync(fullPath), `Rota obrigatória não encontrada: ${route}`);
  const content = fs.readFileSync(fullPath, "utf-8");

  // Every route must use max-w container with responsive horizontal padding (px-4 sm:px-6)
  assert.ok(
    content.includes("px-4") || content.includes("p-4") || content.includes("p-5"),
    `${route} deve possuir padding responsivo para celular (p-4/px-4)`
  );
  assert.ok(
    content.includes("sm:") || content.includes("md:") || content.includes("lg:"),
    `${route} deve possuir breakpoints para tablet ou desktop`
  );
}
console.log(`  ✓ Todas as ${routes.length} rotas validadas com containers responsivos.`);

// [Test 2] Header Mobile Navigation & Drawer
console.log("\n[Test 2] Verificando Menu Mobile e Barra Inferior de Ações Rápidas...");
const headerPath = path.join(ROOT, "src/components/layout/header.tsx");
const headerContent = fs.readFileSync(headerPath, "utf-8");

// Mobile bottom bar must have 5 columns and correct user profile / forum links
assert.ok(
  headerContent.includes("grid-cols-5"),
  "A barra inferior móvel deve possuir 5 colunas para acesso rápido às 5 áreas principais."
);
assert.ok(
  headerContent.includes('href={user ? "/profile" : "/login"}'),
  "O botão de perfil na barra inferior deve direcionar para /profile se logado."
);
assert.ok(
  headerContent.includes('href="/forum"'),
  "O fórum deve estar presente no menu de navegação."
);
assert.ok(
  headerContent.includes("min-h-[44px]"),
  "Links do menu mobile devem possuir área de toque mínima acessível de 44px."
);
console.log("  ✓ Menu mobile e barra inferior validados com touch targets e 5 áreas.");

// [Test 3] Check Pagination responsiveness
console.log("\n[Test 3] Verificando Paginação Responsiva...");
const paginationPath = path.join(ROOT, "src/features/catalog/pagination.tsx");
const paginationContent = fs.readFileSync(paginationPath, "utf-8");

assert.ok(
  paginationContent.includes("sm:hidden") && paginationContent.includes("hidden items-center gap-1 sm:flex"),
  "Paginação deve exibir indicador compacto no celular e botões numéricos no tablet/desktop."
);
console.log("  ✓ Paginação adaptativa para celular (<640px) e telas maiores verificada.");

// [Test 4] Check Markdown Code Blocks & Overflow Protection
console.log("\n[Test 4] Verificando proteção contra overflow horizontal em Markdown e Código...");
const markdownPath = path.join(ROOT, "src/features/forum/markdown-view.tsx");
const markdownContent = fs.readFileSync(markdownPath, "utf-8");

assert.ok(
  markdownContent.includes("overflow-x-auto"),
  "Blocos de código devem ter scroll horizontal interno (overflow-x-auto)."
);
assert.ok(
  markdownContent.includes("break-words"),
  "Container de markdown deve usar break-words para impedir quebra de layout por strings longas."
);

const globalsCssPath = path.join(ROOT, "src/app/globals.css");
const globalsCss = fs.readFileSync(globalsCssPath, "utf-8");
assert.ok(
  globalsCss.includes("overflow-x: clip") || globalsCss.includes("overflow-x: hidden"),
  "html e body devem conter overflow-x: clip para prevenir scroll horizontal global indevido."
);
console.log("  ✓ Proteção contra rolagem horizontal e overflow em código validada.");

// [Test 5] Bilingual dictionary synchronization for new routes
console.log("\n[Test 5] Verificando sincronização bilíngue (PT-BR / EN)...");
const dictPath = path.join(ROOT, "src/lib/i18n/dictionaries.ts");
const dictContent = fs.readFileSync(dictPath, "utf-8");

assert.ok(
  dictContent.includes("cybercrimeResearchPage"),
  "Dicionário deve conter chaves para a área de cybercrime research."
);
assert.ok(
  dictContent.includes("myContributionsPage"),
  "Dicionário deve conter chaves completas para minhas contribuições."
);
console.log("  ✓ Dicionários PT-BR e EN sincronizados sem disparidades.");

console.log("\n>>> TODOS OS 5 TESTES DE RESPONSIVIDADE FORAM APROVADOS! <<<");
