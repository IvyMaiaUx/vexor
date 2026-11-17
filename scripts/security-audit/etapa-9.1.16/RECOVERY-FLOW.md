# RECOVERY-FLOW — Etapa 9.1.16

## 1. Fluxo Completo de Recuperação de Senha (Supabase Auth + `@supabase/ssr`)
1. **Solicitação (`/forgot-password` -> `src/app/forgot-password/page.tsx`):**
   - O usuário informa o e-mail e envia o formulário (com proteção contra duplo envio `if (isSubmitting) return`).
   - A página chama `requestPasswordRecovery()` em `src/features/auth/recovery-service.ts`.
   - `requestPasswordRecovery()` valida o formato do e-mail (`EMAIL_REGEX`), constrói `redirectTo` apontando para `/auth/callback?type=recovery&next=%2Fauth%2Freset-password` (validado com `getSafeRedirectPath()`) e invoca `supabase.auth.resetPasswordForEmail(email, { redirectTo })` usando o cliente browser existente (`src/lib/supabase/client.ts`).
   - **Anti-enumeração:** Exceto por `invalid_email`, `rate_limited` (`429`) e `network_error`, a interface sempre apresenta mensagem neutra sem revelar se o e-mail possui conta cadastrada.
2. **Troca de Código PKCE (`/auth/callback` -> `src/app/auth/callback/route.ts`):**
   - Ao clicar no link do e-mail enviado pelo Supabase, o navegador acessa `GET /auth/callback?type=recovery&next=%2Fauth%2Freset-password&code=...`.
   - O servidor executa `supabase.auth.exchangeCodeForSession(code)` (cliente server `@supabase/ssr` com cookies HTTP) e redireciona para `/auth/reset-password` (ou `/auth/reset-password?error=recovery_link_invalid` em caso de código ausente/inválido/expirado/reutilizado).
3. **Validação da Sessão e Atualização (`/auth/reset-password` -> `src/app/auth/reset-password/page.tsx`):**
   - A página valida a sessão real com o servidor Supabase via `validateRecoverySession()` (`supabase.auth.getUser()`), mantendo também listener de `onAuthStateChange` para `PASSWORD_RECOVERY` e `SIGNED_OUT`.
   - Caso a sessão seja inválida, expirada ou inexistente, o formulário **não** é renderizado; exibe-se alerta acessível (`role="alert"`) com opção de solicitar novo link em `/forgot-password`.
   - Com sessão válida, `updatePasswordWithSupabase()` valida comprimento mínimo (`>= 8`), correspondência entre os campos, revalida a sessão via `getUser()` e chama `supabase.auth.updateUser({ password: newPassword })`.
   - Após sucesso, limpa os campos em memória, chama `refreshSession()` (`useAuthStore` / `syncClientSessionFromServer()`) para sincronizar o estado real da sessão com o servidor e exibe opções para `/catalog` ou `/login`.
4. **Rota Legada (`/reset-password` -> `src/app/reset-password/page.tsx`):**
   - Redireciona server-side para `/auth/reset-password`, eliminando o fluxo simulado anterior.
