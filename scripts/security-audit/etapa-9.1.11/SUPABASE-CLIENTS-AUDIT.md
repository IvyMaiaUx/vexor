# Etapa 9.1.11 — Supabase Clients Audit

- **Data:** 2026-11-13
- **Arquivos analisados:** `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, busca global em `src/`.

## 1. Cliente do Navegador (`src/lib/supabase/client.ts`)

- Utiliza `createBrowserClient<Database>(supabaseUrl, supabaseKey)` de `@supabase/ssr`.
- Mantém singleton de módulo (`let browserClient`) apenas no navegador, evitando múltiplas instâncias no cliente.
- Lê apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (com fallback para `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **Status:** Implementado corretamente, porém **não é importado em nenhum componente ou store atualmente**.

## 2. Cliente do Servidor (`src/lib/supabase/server.ts`)

- Exporta `export async function createClient()`, criando uma **nova instância por requisição** via `createServerClient<Database>`.
- Integra-se corretamente com `const cookieStore = await cookies()` (obrigatório no Next.js 16).
- Implementa `getAll()` e `setAll()` com bloco `try/catch` documentado para Server Components (onde `cookies().set()` não pode gravar headers).
- **Isolamento por requisição:** Respeitado integralmente — **não há singleton de servidor**.
- **Status:** Implementado corretamente, porém **não é importado em nenhuma página, Server Action ou Route Handler atualmente**.

## 3. Achado principal

Toda a camada oficial `@supabase/ssr` já existe pronta em `src/lib/supabase/`, mas permanece desconectada da aplicação, que ainda opera 100% sobre `useAuthStore` em `localStorage`.
