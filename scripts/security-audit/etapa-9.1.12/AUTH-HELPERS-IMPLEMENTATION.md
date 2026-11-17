# Etapa 9.1.12 — Auth Helpers Implementation

- **Data:** 2026-11-13
- **Arquivo criado:** `src/lib/supabase/auth.ts`

## Funções exportadas

1. `getAuthenticatedUser(): Promise<AuthenticatedUser | null>`
   - Instancia o cliente server por requisição (`createClient()`).
   - Valida a identidade via `await supabase.auth.getUser()`.
   - Retorna `{ id, email }` ou `null` caso não autenticado ou em erro.
2. `getAuthenticatedSessionContext(): Promise<AuthenticatedSessionContext | null>`
   - Chama `getAuthenticatedUser()`; se `null`, retorna `null` imediatamente evitando consulta desnecessária ao banco.
   - Quando autenticado, consulta explicitamente as colunas de `public.profiles` para `id = user.id` (`maybeSingle()`), respeitando a RLS `profiles_select_own_or_mod`.
   - Nunca lê `localStorage` e nunca confia em `role` enviado pelo cliente.
