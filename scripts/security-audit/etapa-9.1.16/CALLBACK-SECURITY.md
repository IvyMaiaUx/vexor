# CALLBACK-SECURITY — Etapa 9.1.16

## 1. Análise de `src/app/auth/callback/route.ts`
- **PKCE / `exchangeCodeForSession()`:** Preservado integralmente para todos os fluxos de callback (confirmação de e-mail, OAuth e recuperação de senha).
- **Separação segura entre confirmação de e-mail e recuperação:**
  - Fluxo de recuperação identificado por `type=recovery` no query param do `redirectTo`.
  - Mesmo que um atacante manipule `type=recovery` manualmente sem um `code` válido, `exchangeCodeForSession(code)` falhará e redirecionará para `/auth/reset-password?error=recovery_link_invalid` (onde o formulário de redefinição permanece bloqueado porque `getUser()` não encontra sessão válida).
  - Quando `type=recovery` está presente, `safeNext` é validado por `getSafeRedirectPath()` e restrito a `/auth/reset-password` (impedindo desvio para outra rota interna arbitrária).
- **Prevenção de Open Redirect:**
  - Todo `next` passa por `getSafeRedirectPath()` (`src/lib/security/redirect.ts`), bloqueando URLs absolutas (`https://...`), protocol-relative (`//...`), backslashes (`\`), caracteres de controle e loops para `/auth/callback`.
- **Proteção contra vazamento de código:**
  - O parâmetro `code` nunca é ecoado na URL de redirecionamento nem exibido na interface.
- **Preservação do fluxo de confirmação de e-mail:**
  - Quando `type !== "recovery"`, o destino padrão permanece `/catalog` (ou `safeNext` validado) e falhas continuam redirecionando para `/login?error=auth_callback_failed`.
