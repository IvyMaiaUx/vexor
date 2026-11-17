# ETAPA 9.1.15.1 — LOGOUT AUDIT

## 1. Fluxo Inspecionado

- `useAuthStore.signOut()` -> `performConsistentSignOut()` (`src/features/auth/session-sync.ts`).
- `POST /api/auth/logout` (`src/app/api/auth/logout/route.ts`) -> `supabase.auth.signOut()` no servidor.
- `clientSignOut` -> `createClient().auth.signOut()` no browser.

## 2. Pontos Verificados

- **Invalidação de cookies SSR:** `POST /api/auth/logout` executa `signOut()` usando o cliente server per-request (`cookies()`).
- **Chamadas concorrentes:** `inFlightSignOut` garante execução única mesmo sob múltiplos cliques simultâneos (`Test 13b`).
- **Falha de rede:** Capturada com `try/catch` tanto em `serverLogout()` quanto em `clientSignOut()`, retornando `{ ok: false, networkError: true }` sem lançar exceção.
- **Atualização da store:** `SESSION_STORAGE_KEY`, `AUTH_MODE_STORAGE_KEY` e `AUTH_SYNC_META_KEY` são limpos e notificados via `notifyAuthListeners()` (`storage` + `AUTH_STORE_EVENT`).
- **Observação (`FINDING-04`):** `signOut()` é disparado de forma fire-and-forget (`void performConsistentSignOut(...)`) sem redirecionamento explícito nem aviso visual caso `networkError: true` ocorra.
