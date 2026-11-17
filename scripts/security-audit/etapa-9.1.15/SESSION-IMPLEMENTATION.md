# ETAPA 9.1.15 — Session Implementation

- **Data:** 2026-11-13
- **Arquivos criados/modificados:**
  - `src/lib/supabase/auth.ts` (modificado)
  - `src/app/api/auth/session/route.ts` (modificado)
  - `src/app/api/auth/logout/route.ts` (criado)
  - `src/features/auth/session-sync.ts` (criado)
  - `src/features/auth/use-auth-store.ts` (modificado)
  - `src/components/auth/auth-session-sync.tsx` (criado)
  - `src/app/layout.tsx` (modificado)

## 1. Sessão SSR e Cookies Oficiais

- Nenhuma criação manual de token ou gravação de tokens/senhas em `localStorage`.
- `src/lib/supabase/server.ts` cria cliente por requisição (sem singleton no servidor).
- `src/proxy.ts` executa `updateSession()` com `supabase.auth.getUser()` para renovar cookies SSR.
- `resolveServerSessionWithClient()` distingue `authenticated`, `unauthenticated` (inclusive sessão expirada), `profile_missing` e `connection_error`.

## 2. Sincronização Global, F5, Novas Abas e Logout

- `AuthSessionSync` (`src/components/auth/auth-session-sync.tsx`), montado em `src/app/layout.tsx`, sincroniza `useAuthStore` com `GET /api/auth/session` na inicialização, no foco/visibilidade da aba e em eventos `onAuthStateChange` do Supabase.
- `useAuthStore` expõe `isLoading`, `sessionExpired`, `syncError`, `authMode` (`"supabase" | "demo" | null`) e `refreshSession()`.
- `POST /api/auth/logout` executa `supabase.auth.signOut()` no servidor; `useAuthStore.signOut()` limpa o estado local em todas as abas (`storage` + `AUTH_STORE_EVENT`) e invoca o logout SSR.
- Falhas de conexão retornam HTTP `503` em `/api/auth/session` e marcam `syncError: "connection_error"` sem fallback silencioso para `DEMO_PROFILES`.
