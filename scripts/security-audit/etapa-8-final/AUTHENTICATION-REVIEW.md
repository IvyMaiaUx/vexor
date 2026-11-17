# Auditoria de Autenticação — Etapa 8

## 1. Fluxos Inspecionados

- **Login e Logout (`src/features/auth/login-service.ts`, `src/app/login/page.tsx`):**
  - Autenticação real via Supabase Auth (`signInWithPassword`), com mensagens genéricas anti-enumeração e sanitização de destino via `getSafeRedirectPath`.
- **Cadastro e Confirmação de E-mail (`src/features/auth/register-service.ts`, `src/app/auth/callback/route.ts`):**
  - Cadastro real via `supabase.auth.signUp`, sem inserção manual em `public.profiles` (criação delegada ao trigger `handle_new_user()`).
  - `/auth/callback/route.ts` realiza troca de `code` (`exchangeCodeForSession(code)`), valida `next` com `getSafeRedirectPath()` e força `/auth/reset-password` em fluxos `type=recovery`.
- **Recuperação e Redefinição de Senha (`src/app/forgot-password/page.tsx`, `src/app/auth/reset-password/page.tsx`):**
  - Formulário de redefinição oculto até validação da sessão de recuperação no servidor/cliente.
- **Validação de Sessão no Servidor (`src/lib/supabase/auth.ts`, `src/app/api/auth/session/route.ts`, `src/proxy.ts`):**
  - `resolveServerSessionWithClient()` chama `supabase.auth.getUser()` (nunca confia apenas em `getSession()`), trata erros de JWT/sessão expirada como `unauthenticated` e falhas de rede como `connection_error` (HTTP `503` em `/api/auth/session`).
  - `/api/auth/session` responde com `Cache-Control: no-store` e exige `profile.id === user.id`.
- **Usuários Suspensos e Roles:**
  - `evaluateSessionAuthorization()` remove `isActiveMember`, `isModerator` e `isAdmin` quando `profile.is_suspended === true` (retornando `account_suspended`, HTTP `403`).
  - Papéis são lidos exclusivamente de `public.profiles` no servidor; nunca de `localStorage` para decisões de segurança.
