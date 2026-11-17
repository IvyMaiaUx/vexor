# ETAPA 9.1.14 — Login Implementation

- **Data:** 2026-11-13
- **Arquivos criados/modificados:**
  - `src/features/auth/login-service.ts` (criado)
  - `src/app/api/auth/session/route.ts` (criado)
  - `src/app/login/page.tsx` (modificado)
  - `src/features/auth/use-auth-store.ts` (modificado)
  - `src/lib/i18n/dictionaries.ts` (modificado)

## 1. Fluxo de Login Real

1. `src/app/login/page.tsx` coleta `email` e `password` e bloqueia envios duplicados com `isSubmitting`.
2. Valida formato de e-mail (`EMAIL_REGEX`) e comprimento mínimo de senha (`>= 8` caracteres) antes de qualquer requisição.
3. Chama `loginWithSupabase()` (`src/features/auth/login-service.ts`), que executa exclusivamente `supabase.auth.signInWithPassword({ email, password })` via `createClient()` (`src/lib/supabase/client.ts`).
4. Após autenticação bem-sucedida, consulta `GET /api/auth/session`, que executa `getAuthenticatedSessionContext()` no servidor (`getUser()` + leitura de `public.profiles`).
5. Se `is_suspended === true`, o acesso protegido é bloqueado e a UI exibe `dict.auth.errors.accountSuspended` sem redirecionar para rotas protegidas.
6. Se ativo e com perfil válido, sincroniza o estado de exibição em `useAuthStore` via `setAuthenticatedSession(result.profile)` e redireciona com `getSafeRedirectPath(nextPath, "/catalog")`.

## 2. Tratamento de Erros e Separação do Modo Demo

- Credenciais inválidas ou e-mail não confirmado retornam mensagem neutra (`invalid_credentials`) sem revelar se o e-mail possui cadastro.
- Erros de rede (`network_error`), rate limit (`rate_limited`) e ausência de perfil (`profile_missing`) possuem tratamento específico e amigável em `pt-BR` e `en`.
- Não há fallback silencioso para `DEMO_PROFILES` quando o Supabase falha. O bloco "Quick Role Simulator" permanece explicitamente separado no card da página de login.
