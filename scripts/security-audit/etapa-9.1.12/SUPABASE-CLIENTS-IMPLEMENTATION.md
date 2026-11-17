# Etapa 9.1.12 — Supabase Clients Implementation

- **Data:** 2026-11-13
- **Arquivos revisados:** `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`

## 1. Cliente Browser (`src/lib/supabase/client.ts`)

- Mantido sem alterações após auditoria.
- Utiliza `createBrowserClient<Database>` de `@supabase/ssr` com singleton de navegador (`browserClient`).
- Lê apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (com fallback para `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- Nenhuma referência a `service_role` ou segredos privilegiados.

## 2. Cliente Server (`src/lib/supabase/server.ts`)

- Mantido sem alterações após auditoria.
- Cria instância isolada por requisição com `createServerClient<Database>` e `const cookieStore = await cookies()` (Next.js 16).
- Implementa `getAll()` e `setAll()` com tratamento seguro em Server Components (`try/catch`), sem singleton global e sem `service_role`.
