# Etapa 9.1.12 — Implementation Plan

- **Data:** 2026-11-13
- **Objetivo:** Integrar a camada base de infraestrutura Supabase Auth no servidor e callback PKCE, preservando integralmente `useAuthStore` e o sistema simulado atual para migração gradual nas etapas seguintes.

## 1. Diagnóstico prévio confirmado

- `next`: `16.4.6`, `@supabase/ssr`: `0.12.7`, `@supabase/supabase-js`: `2.119.0`.
- `src/lib/supabase/client.ts`: já implementa `createBrowserClient<Database>` com singleton apenas no navegador e variáveis públicas. Sem necessidade de alteração.
- `src/lib/supabase/server.ts`: já implementa `createServerClient<Database>` por requisição com `await cookies()`, `getAll()` / `setAll()` e sem `service_role`. Sem necessidade de alteração.
- `src/proxy.ts`: já implementa `updateSession()` com `getUser()`, propagação de cookies e `matcher` compatível com Next.js 16.4.6. Sem necessidade de alteração nesta etapa.

## 2. Alterações planejadas

1. **Criar `src/lib/security/redirect.ts`:**
   - Função pura `getSafeRedirectPath(target, defaultPath = "/catalog")` para validar destinos internos de redirecionamento, bloqueando URLs externas, protocol-relative (`//`), backslashes (`\`), caracteres de controle e loop para `/auth/callback`.
2. **Criar `src/app/auth/callback/route.ts`:**
   - Route Handler `GET` para receber `code` e `next`, trocar o código por sessão via `supabase.auth.exchangeCodeForSession(code)` no cliente server, tratar falhas redirecionando para `/login?error=auth_callback_failed` sem expor detalhes sensíveis, e redirecionar para o destino validado.
3. **Criar `src/lib/supabase/auth.ts`:**
   - Helpers server-side tipados (`getAuthenticatedUser()` e `getAuthenticatedSessionContext()`) utilizando `createClient()` + `supabase.auth.getUser()` e consulta explícita em `public.profiles` apenas quando autenticado.
4. **Criar suíte de testes unitários (`scripts/test-auth-infra-etapa9-1-12.mjs`):**
   - Validar `getSafeRedirectPath`, comportamento do callback para `code` ausente/inválido/externo, e ausência de `service_role` nos módulos de cliente.
