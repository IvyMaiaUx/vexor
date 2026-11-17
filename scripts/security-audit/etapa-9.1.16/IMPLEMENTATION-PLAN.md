# IMPLEMENTATION-PLAN — Etapa 9.1.16 (Recuperação de Senha com Supabase Auth)

## 1. Diagnóstico Inicial
- `src/app/login/page.tsx` já direciona para `/forgot-password`.
- `src/app/forgot-password/page.tsx` utilizava `setTimeout(..., 600)` simulado e exibia link de simulação para `/reset-password?email=...`.
- `src/app/reset-password/page.tsx` utilizava `setTimeout(..., 600)` simulado sem validar sessão de recuperação no Supabase Auth.
- `src/app/auth/callback/route.ts` já executava `exchangeCodeForSession(code)` com `getSafeRedirectPath()`, mas não diferenciava explicitamente o contexto `type=recovery` para redirecionar ao fluxo de redefinição de senha nem tratava erro específico de link de recuperação inválido/expirado.

## 2. Solução Proposta
1. **`src/features/auth/recovery-service.ts`:**
   - `requestPasswordRecovery()`: valida e-mail, constrói `redirectTo` seguro (`/auth/callback?type=recovery&next=%2Fauth%2Freset-password`) com `getSafeRedirectPath()`, chama `supabase.auth.resetPasswordForEmail()`, e garante resposta neutra anti-enumeração.
   - `validateRecoverySession()`: valida sessão ativa no servidor Supabase via `supabase.auth.getUser()`.
   - `updatePasswordWithSupabase()`: valida comprimento mínimo (`>= 8`) e confirmação, revalida sessão via `getUser()`, chama `supabase.auth.updateUser({ password })` e trata erros sem expor senhas/tokens.
2. **`src/app/auth/callback/route.ts`:**
   - Preserva `exchangeCodeForSession(code)` e confirmação de e-mail.
   - Quando `type === "recovery"`, direciona sucesso para `/auth/reset-password` (validado via `getSafeRedirectPath()`) e falha para `/auth/reset-password?error=recovery_link_invalid`.
3. **`src/app/auth/reset-password/page.tsx` e `src/app/reset-password/page.tsx`:**
   - Implementa a tela real de redefinição em `/auth/reset-password` com validação de sessão via `getUser()`, toggle mostrar/ocultar senha, força de senha i18n, bloqueio de envio duplicado e atualização real via `updateUser()`.
   - Atualiza `/reset-password` para redirecionar para `/auth/reset-password` sem manter fluxo simulado.
4. **`src/app/forgot-password/page.tsx` e `src/lib/i18n/dictionaries.ts`:**
   - Remove a simulação e integra `requestPasswordRecovery()`, mantendo `DEMO_PROFILES` isolado.
5. **Testes offline automatizados (`scripts/test-password-recovery-etapa9-1-16.mjs`) e regressão (`scripts/test-session-auth-etapa9-1-15.mjs`).**
