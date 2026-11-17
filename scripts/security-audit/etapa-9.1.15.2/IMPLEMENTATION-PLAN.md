# ETAPA 9.1.15.2 — PLANO DE IMPLEMENTAÇÃO

- **Data:** 2026-11-13
- **Objetivo:** Corrigir os achados `FINDING-01`, `FINDING-04` e `FINDING-05` da auditoria 9.1.15.1 e documentar `FINDING-06` sem alterar permissões do Windows ou o Supabase remoto.

---

## 1. Plano de Correções

1. **FINDING-01 (`src/lib/supabase/auth.ts`, `src/proxy.ts`, `src/app/cybercrime-research/layout.tsx`):**
   - Estender `evaluateProtectedRouteAccess()` em `src/lib/supabase/auth.ts` para proteger `/cybercrime-research` e `/cybercrime-research/*` exigindo `"active_member"` (`authenticated` + perfil válido + `!is_suspended`), redirecionando anônimos para `/login?next=...` via `getSafeRedirectPath()` e bloqueando suspensos/sem perfil/erro de conexão (`/catalog`).
   - Preservar integralmente o acesso público a `/`, `/catalog`, `/forum`, `/login`, `/register`, `/forgot-password` e `/reset-password`.
   - Atualizar `src/proxy.ts` para aplicar `evaluateProtectedRouteAccess()` também às rotas `/cybercrime-research/*`.
   - Criar `src/app/cybercrime-research/layout.tsx` (Server Component `force-dynamic`) chamando `requireServerAuthorization("active_member")` para garantir proteção server-side independente do proxy.

2. **FINDING-04 (`src/features/auth/session-sync.ts`, `src/features/auth/use-auth-store.ts`, `src/lib/i18n/dictionaries.ts`, `src/components/auth/sign-out-error-banner.tsx`, `src/components/layout/header.tsx`, `src/features/admin/components/admin-layout-shell.tsx`):**
   - Adicionar `isSigningOut` e `signOutError` em `AuthSyncMeta` (`session-sync.ts`) e expô-los em `useAuthStore`.
   - Em `performConsistentSignOut()`, manter lock single-flight (`inFlightSignOut`), `bumpSyncEpoch()`, limpeza segura de `SESSION_STORAGE_KEY`/`AUTH_MODE_STORAGE_KEY` (sem conceder acesso visual em caso de falha) e definir `signOutError: true` caso `serverLogout()` ou `clientSignOut()` falhem, permitindo nova tentativa segura.
   - Adicionar mensagens `auth.errors.logoutFailed` e `auth.retrySignOut` em `pt-BR` e `en` (`src/lib/i18n/dictionaries.ts`).
   - Criar `SignOutErrorBanner` (`src/components/auth/sign-out-error-banner.tsx`) e exibi-lo em `Header` e `AdminLayoutShell` quando `signOutError === true`.

3. **FINDING-05 (`scripts/test-session-auth-etapa9-1-15.mjs`):**
   - Ampliar a suíte comportamental offline cobrindo autorização completa, proteção de `/cybercrime-research/*` vs páginas públicas, sincronização (`single-flight`, `syncEpoch`, expiração, falhas de rede) e logout (sucesso, falha, chamadas simultâneas e nova tentativa após falha).

4. **FINDING-06 (Investigação Ambiental):**
   - Documentar evidências de ACL (`CodexSandboxUsers` apenas `ReadAndExecute, Synchronize` em `.next`) sem alterar permissões do Windows; executar `npx tsc --noEmit`, `npm run lint` e tentativa controlada de `npx next build --webpack`.
