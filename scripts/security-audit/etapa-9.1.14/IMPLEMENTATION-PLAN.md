# ETAPA 9.1.14 — PLANO TÉCNICO E DIAGNÓSTICO DO LOGIN REAL

- **Data:** 2026-11-13
- **Objetivo:** Implementar o login real por e-mail e senha com Supabase Auth (`supabase.auth.signInWithPassword()`), integrando `/login` à infraestrutura SSR já existente (`src/lib/supabase/server.ts`, `src/lib/supabase/auth.ts`, `src/proxy.ts`, `src/lib/security/redirect.ts`).

---

## 1. Diagnóstico do Estado Atual

1. **`src/app/login/page.tsx`:**
   - O formulário atual utiliza `signInWithIdentifier(identifier, password)` do `useAuthStore`, que realiza busca local em `DEMO_PROFILES` + `localStorage` sem validação real de senha.
   - O redirecionamento atual usa um `getSafeRedirectTarget()` local simples (`next.startsWith("/") && !next.startsWith("//")`), inferior a `getSafeRedirectPath()` (`src/lib/security/redirect.ts`).
   - Não possui estado `isSubmitting` nem proteção contra envios duplicados.
   - Contém bloco separado de "Quick Role Simulator" (`DEMO_PROFILES`) via `handleDemoSignIn`.
2. **Infraestrutura Supabase SSR existente:**
   - `src/lib/supabase/client.ts`: cliente browser singleton com chaves públicas (`NEXT_PUBLIC_*`).
   - `src/lib/supabase/server.ts`: cliente SSR por requisição via `cookies()`.
   - `src/lib/supabase/auth.ts`: `getAuthenticatedUser()` valida identidade no servidor com `supabase.auth.getUser()` e `getAuthenticatedSessionContext()` consulta `public.profiles` (`role`, `is_suspended`, etc.).
   - `src/proxy.ts`: `updateSession()` renova cookies SSR e valida sessão com `getUser()`.
   - `src/lib/security/redirect.ts`: `getSafeRedirectPath()` bloqueia open redirects (`//`, `\`, caracteres de controle, hosts externos e loops para `/auth/callback`).
3. **`useAuthStore`, `DEMO_PROFILES` e Guards:**
   - `useAuthStore` (`src/features/auth/use-auth-store.ts`) alimenta a UI cliente (`Header`, `AdminGuard`, `ResearchAccessGuard`, páginas `/admin/*`, `/catalog/submit`, `/forum/*`, `/profile/*`).
   - `DEMO_PROFILES` também é referenciado por `src/features/admin/services/admin-service.ts`.
   - Para que a UI reflita a sessão real sem confiar em permissões fornecidas pelo cliente, é necessário sincronizar a store cliente com uma fonte confiável do servidor (`getAuthenticatedSessionContext()`), mantendo separação explícita de qualquer fluxo demo e **sem fallback silencioso** quando o Supabase falhar.

---

## 2. Plano de Implementação

1. **Dicionários (`src/lib/i18n/dictionaries.ts`):**
   - Adicionar/atualizar chaves `pt-BR` e `en` para login por e-mail (`emailLabel`, `emailPlaceholder`), estado de carregamento (`signingInButton`), erros genéricos seguros (`invalidCredentials` sem mencionar perfis de teste no fluxo real, `networkError`, `rateLimited`, `profileMissing`, `accountSuspended`) e aviso de separação explícita do modo demo.
2. **Endpoint de Sessão SSR (`src/app/api/auth/session/route.ts`):**
   - Criar `GET /api/auth/session` utilizando exclusivamente `getAuthenticatedSessionContext()` no servidor (`getUser()` + query `public.profiles`), retornando `{ authenticated, user, profile }` com `Cache-Control: no-store`.
   - Nunca aceitar `role` ou `isSuspended` do cliente.
3. **Serviço de Login Real (`src/features/auth/login-service.ts`):**
   - Validar e-mail (`EMAIL_REGEX`) e senha (`>= 8` caracteres ou não vazia — mantendo compatibilidade com mínimo de 8 caracteres da UI) antes da requisição.
   - Chamar exclusivamente `authClient.signInWithPassword({ email, password })` (via `createClient().auth` ou cliente injetável para testes offline).
   - Após sucesso do `signInWithPassword()`, confirmar identidade com `getUser()` / sessão SSR e consultar `public.profiles` via fonte confiável do servidor (`fetchSessionContext` -> `/api/auth/session` ou client injetável em testes), obtendo `role` e `is_suspended` exclusivamente do servidor.
   - Tratar:
     - Credenciais inválidas / e-mail não confirmado -> erro amigável neutro (`invalid_credentials`) sem revelar se o e-mail existe;
     - Erro de rede/indisponibilidade -> `network_error`;
     - Rate limit (`429`) -> `rate_limited`;
     - Usuário autenticado sem perfil correspondente em `public.profiles` -> `profile_missing` (sem criar perfil manualmente);
     - Usuário com `is_suspended === true` -> `account_suspended` (impedindo acesso protegido conforme regras existentes);
     - Redirecionamento validado com `getSafeRedirectPath(nextPath, "/catalog")`.
   - Zero armazenamento de senha em `localStorage`, `sessionStorage` ou cookies manuais.
4. **Integração com `useAuthStore` (`src/features/auth/use-auth-store.ts`) e `src/app/login/page.tsx`:**
   - Adicionar `setAuthenticatedSession(profile)` / `hydrateSession()` em `useAuthStore` para refletir o perfil validado pelo servidor na UI (sem tratar a store como autoridade de segurança) e garantir que `signOut()` encerre também a sessão Supabase (`createClient().auth.signOut()`).
   - Atualizar `src/app/login/page.tsx` para usar `loginWithSupabase()`, campo de e-mail, estado `isSubmitting` com prevenção de envios duplicados, tratamento explícito de conta suspensa/ausência de perfil/credenciais inválidas/rede, redirecionamento via `getSafeRedirectPath()`, e separação explícita do bloco "Quick Role Simulator (Demo Offline)" sem qualquer fallback silencioso no formulário real.
5. **Testes Offline (`scripts/test-login-etapa9-1-14.mjs`):**
   - Cobrir todos os 10 cenários obrigatórios sem credenciais reais e sem criar usuários remotos.
   - Executar `node scripts/test-login-etapa9-1-14.mjs`, `npx tsc --noEmit`, `npm run lint` e `npx next build --webpack`.
6. **Documentação (`scripts/security-audit/etapa-9.1.14/`):**
   - Produzir `IMPLEMENTATION-PLAN.md`, `LOGIN-IMPLEMENTATION.md`, `SESSION-INTEGRATION.md`, `SECURITY-REVIEW.md`, `TEST-RESULTS.md` e `FINAL-REPORT.md`.
