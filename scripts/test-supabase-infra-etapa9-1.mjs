/**
 * VEXOR - TESTE AUTOMATIZADO ETAPA 9.1
 * Infraestrutura Supabase (Clientes, Proxy, Tipagem e Variáveis)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("==================================================");
console.log("   VEXOR - TESTE AUTOMATIZADO ETAPA 9.1           ");
console.log("   (Infraestrutura Supabase & Next.js 16 Proxy)  ");
console.log("==================================================");

let failed = false;
function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FALHA: ${message}`);
    failed = true;
  } else {
    console.log(`  ✓ ${message}`);
  }
}

// 1. Dependências no package.json
console.log("\n>>> [1/7] Verificando dependências @supabase/supabase-js e @supabase/ssr...");
const pkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
assert(Boolean(pkgJson.dependencies["@supabase/supabase-js"]), "@supabase/supabase-js instalado em dependencies");
assert(Boolean(pkgJson.dependencies["@supabase/ssr"]), "@supabase/ssr instalado em dependencies");
assert(pkgJson.dependencies["next"] === "16.4.6", "Next.js preservado estritamente na versão 16.4.6");

// 2. Variáveis de ambiente e proteção no .gitignore
console.log("\n>>> [2/7] Verificando .env.example, .env.local e proteção no .gitignore...");
assert(fs.existsSync(path.join(rootDir, ".env.local")), ".env.local existe no diretório raiz");
assert(fs.existsSync(path.join(rootDir, ".env.example")), ".env.example existe como template");

const envLocal = fs.readFileSync(path.join(rootDir, ".env.local"), "utf8");
assert(envLocal.includes("NEXT_PUBLIC_SUPABASE_URL="), ".env.local contém NEXT_PUBLIC_SUPABASE_URL");
assert(
  envLocal.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=") || envLocal.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY="),
  ".env.local contém chave pública do Supabase"
);

const envExample = fs.readFileSync(path.join(rootDir, ".env.example"), "utf8");
assert(!envExample.includes("sb_publishable_NjC5045SpfeorUL6RAK2uw"), ".env.example não vaza a chave real de produção");

const gitignore = fs.readFileSync(path.join(rootDir, ".gitignore"), "utf8");
assert(gitignore.includes(".env.*") && gitignore.includes("!.env.example"), ".gitignore protege .env.local contra commits");

// 3. Cliente de Navegador (Browser Client)
console.log("\n>>> [3/7] Verificando src/lib/supabase/client.ts...");
const clientPath = path.join(rootDir, "src", "lib", "supabase", "client.ts");
assert(fs.existsSync(clientPath), "src/lib/supabase/client.ts existe");
const clientCode = fs.readFileSync(clientPath, "utf8");
assert(clientCode.includes("createBrowserClient"), "Utiliza createBrowserClient de @supabase/ssr");
assert(clientCode.includes("Database"), "Tipado com a interface Database");
assert(!clientCode.includes("service_role"), "Não utiliza service_role no cliente browser");

// 4. Cliente de Servidor (Server Client)
console.log("\n>>> [4/7] Verificando src/lib/supabase/server.ts...");
const serverPath = path.join(rootDir, "src", "lib", "supabase", "server.ts");
assert(fs.existsSync(serverPath), "src/lib/supabase/server.ts existe");
const serverCode = fs.readFileSync(serverPath, "utf8");
assert(serverCode.includes("createServerClient"), "Utiliza createServerClient de @supabase/ssr");
assert(serverCode.includes("cookies"), "Integrado à API de cookies do Next.js");
assert(serverCode.includes("await cookies()"), "Compatível com a API assíncrona de cookies do Next.js 16");
assert(serverCode.includes("getAll") && serverCode.includes("setAll"), "Implementa métodos getAll/setAll recomendados");

// 5. Proxy do Next.js 16
console.log("\n>>> [5/7] Verificando src/proxy.ts...");
const proxyPath = path.join(rootDir, "src", "proxy.ts");
assert(fs.existsSync(proxyPath), "src/proxy.ts existe");
const proxyCode = fs.readFileSync(proxyPath, "utf8");
assert(proxyCode.includes("updateSession"), "Implementa rotina updateSession para renovação de token");
assert(proxyCode.includes("getUser()"), "Utiliza getUser() para validação criptográfica no servidor");
assert(proxyCode.includes("matcher"), "Possui matcher excluindo arquivos estáticos e imagens");

// 6. Tipagem do Banco de Dados
console.log("\n>>> [6/7] Verificando src/types/database.types.ts...");
const typesPath = path.join(rootDir, "src", "types", "database.types.ts");
assert(fs.existsSync(typesPath), "src/types/database.types.ts existe");
const typesCode = fs.readFileSync(typesPath, "utf8");
const expectedTables = [
  "profiles", "categories", "resources", "topics", "posts", "tags",
  "topic_tags", "votes", "bookmarks", "reports", "notifications", "audit_logs"
];
expectedTables.forEach((table) => {
  assert(typesCode.includes(`${table}: {`), `Tipagem contém definição exata da tabela ${table}`);
});
assert(!typesCode.includes("research_articles: {"), "Não inventa tabela fictícia de research_articles");
assert(typesCode.includes("admin_set_user_role: {"), "Contém tipagem da RPC admin_set_user_role");
assert(typesCode.includes("moderate_resource: {"), "Contém tipagem da RPC moderate_resource");

// 7. Intocabilidade das Migrações SQL
console.log("\n>>> [7/7] Verificando integridade das migrações SQL...");
const migrationsDir = path.join(rootDir, "supabase", "migrations");
const files = fs.readdirSync(migrationsDir).sort();
assert(files.length === 3, `Exatamente 3 migrações existentes (encontrado: ${files.length})`);
assert(files[0] === "20261110000001_schema.sql", "Migração 1 preservada");
assert(files[1] === "20261110000002_functions_triggers.sql", "Migração 2 preservada");
assert(files[2] === "20261110000003_rls_and_grants.sql", "Migração 3 preservada");

console.log("\n==================================================");
if (failed) {
  console.error("   ❌ ALGUNS TESTES DA ETAPA 9.1 FALHARAM!       ");
  console.log("==================================================");
  process.exit(1);
} else {
  console.log("   TODOS OS TESTES DA ETAPA 9.1 FORAM APROVADOS!  ");
  console.log("==================================================");
  process.exit(0);
}
