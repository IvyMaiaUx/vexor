# ETAPA 9.1.15 — PLANO TÉCNICO E DIAGNÓSTICO: SESSÃO, PERFIL E AUTORIZAÇÃO

- **Data:** 2026-11-13
- **Objetivo:** Consolidar a integração entre Supabase Auth, sessão SSR, tabela `public.profiles` e autorização no servidor e frontend do Vexor, sem criar sistema paralelo de roles e sem modificar migrations/RLS.

---

## 1. Diagnóstico Inicial (Divergências Identificadas)

1. **Desconexão entre sessão SSR e `useAuthStore`:**
   - `useAuthStore` (`src/features/auth/use-auth-store.ts`) lê exclusivamente `localStorage` (`cybersec_auth_session`).
   - Após F5, abertura de nova aba, login via `/auth/callback`, expiração da sessão SSR ou alteração de `role`/`is_suspended` no banco, a UI não revalida automaticamente contra `GET /api/auth/session`.
   - Faltam estados de ciclo de vida na store (`isLoading`, `syncError`, `sessionExpired`, `authMode`: `"supabase" | "demo" | null`).
2. **Ausência de helpers padronizados de autorização no servidor:**
   - `src/lib/supabase/auth.ts` possui `getAuthenticatedUser()` e `getAuthenticatedSessionContext()`, mas ainda não expõe helpers explícitos de autorização (`authorizeSession`, `requireAuthenticatedSession`, `requireAdminSession`) nem diferenciação clara entre `unauthenticated`, `profile_missing` e `connection_error`.
   - É necessário validar explicitamente que `profile.id === user.id` e que `is_suspended === true` revoga qualquer privilégio (`isActiveMember = false`, `isModerator = false`, `isAdmin = false`), espelhando `public.current_user_role()` e `public.is_active_member()` do PostgreSQL.
3. **Proteção de rotas administrativas e APIs:**
   - `src/app/admin/layout.tsx` aplica apenas `<AdminGuard>` no cliente (baseado em `useAuthStore`).
   - `src/proxy.ts` atualiza a sessão SSR via `getUser()`, mas não aplica proteção server-side para rotas administrativas (`/admin/*`) quando o usuário não tem sessão válida ou não possui perfil/role confiável no servidor.
4. **Resiliência a erros de conexão e logout:**
   - `GET /api/auth/session` deve distinguir `unauthenticated` (200) de falha de comunicação/consulta ao Supabase (`503` com `error: "session_sync_failed"`), evitando mascarar falhas de rede como logout silencioso.
   - `signOut` deve invalidar a sessão oficial do Supabase SSR (`supabase.auth.signOut()`) e limpar o estado visual local em todas as abas (`storage` + `onAuthStateChange`).

---

## 2. Plano de Implementação

1. **Camada Server-Side de Sessão e Autorização (`src/lib/supabase/auth.ts`):**
   - Refinar `getAuthenticatedSessionContext()` (ou adicionar `resolveServerSession()`) para:
     - Validar identidade via `supabase.auth.getUser()` (nunca `getSession()` como autoridade).
     - Consultar `public.profiles` por `id = user.id` e validar `profile.id === user.id`.
     - Nunca criar perfil manualmente caso `profile` não exista.
     - Distinguir `authenticated`, `unauthenticated`, `profile_missing` e `connection_error`.
   - Adicionar `evaluateSessionAuthorization(context, requiredLevel?)` (`"active_member" | "moderator" | "admin"`):
     - Negar acesso se `!user`, `!profile`, `profile.id !== user.id` ou `profile.is_suspended === true`.
     - Nunca inventar role padrão se o perfil estiver ausente.
2. **Endpoint de Sessão e Logout (`src/app/api/auth/session/route.ts` e `src/app/api/auth/logout/route.ts`):**
   - Atualizar `GET /api/auth/session` para retornar `{ authenticated, status, user, profile, authorization }` com `Cache-Control: no-store` (e `503` em `connection_error`), derivando `role`, `isSuspended` e flags exclusivamente do servidor.
   - Criar `POST /api/auth/logout` executando `supabase.auth.signOut()` no servidor para garantir invalidação limpa dos cookies SSR.
3. **Proteção de Rotas no Proxy (`src/proxy.ts`):**
   - Manter `updateSession()` com `getUser()`.
   - Para rotas `/admin` e `/admin/*`, verificar no servidor (`getUser()` + consulta `public.profiles` se autenticado): se não autenticado, redirecionar para `/login?next=...`; se autenticado mas suspenso, sem perfil ou sem role `moderator`/`admin`, redirecionar/bloquear acesso administrativo sem confiar em estado do cliente.
4. **Sincronização Global do Estado Cliente (`src/features/auth/use-auth-store.ts` e `src/components/auth/auth-session-sync.tsx`):**
   - Evoluir `useAuthStore` com `isLoading`, `syncError`, `sessionExpired`, `authMode` (`"supabase" | "demo" | null`) e `refreshSession()`.
   - Adicionar `AuthSessionSync` no `src/app/layout.tsx` para hidratar/revalidar a sessão real via `GET /api/auth/session` na inicialização, no foco da aba (`visibilitychange`/`focus`) e em `supabase.auth.onAuthStateChange()`, mantendo `DEMO_PROFILES` estritamente separado e sem fallback silencioso.
   - Atualizar `AdminGuard` e `ResearchAccessGuard` para respeitar `isLoading` antes de exibir bloqueio falso durante hidratação inicial e exibir estado claro caso haja erro de sincronização/sessão expirada.
5. **Testes Offline (`scripts/test-session-auth-etapa9-1-15.mjs`):**
   - Cobrir todos os 15 cenários obrigatórios usando mocks controlados (helpers reais, lógica de proxy/guard/store, sem credenciais reais e sem usuários remotos).
6. **Validações e Documentação (`scripts/security-audit/etapa-9.1.15/`):**
   - Executar suíte da etapa, `npx tsc --noEmit`, `npm run lint` e `npx next build --webpack`.
   - Documentar resultados em `SESSION-IMPLEMENTATION.md`, `PROFILE-INTEGRATION.md`, `AUTHORIZATION-REVIEW.md`, `SECURITY-REVIEW.md`, `TEST-RESULTS.md` e `FINAL-REPORT.md`.
