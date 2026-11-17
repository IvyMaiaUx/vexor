# CALLBACK-SECURITY-AUDIT — Etapa 9.1.16.1

## 1. Arquivo Inspecionado
- `src/app/auth/callback/route.ts` (`GET`)
- `src/lib/security/redirect.ts` (`getSafeRedirectPath`)

## 2. Verificação Ponto a Ponto
- **Identificação do fluxo `type=recovery`:** `const isRecoveryFlow = flowType === "recovery";` define `safeNext` restrito a `/auth/reset-password` e falha para `/auth/reset-password?error=recovery_link_invalid`.
- **PKCE / `exchangeCodeForSession()`:** Executado no servidor via `await createClient()` (`src/lib/supabase/server.ts`).
- **Preservação da confirmação de e-mail:** Quando `type !== "recovery"`, o destino padrão permanece `/catalog` (via `getSafeRedirectPath`) e falhas continuam redirecionando para `/login?error=auth_callback_failed`.
- **Códigos inválidos, expirados ou reutilizados:** Rejeitados por `exchangeCodeForSession(code)` ou pela checagem inicial `if (authError || !code || !code.trim())`, sem ecoar `code` na URL ou UI.
- **Prevenção de Open Redirect:** `getSafeRedirectPath()` rejeita URLs externas, `//`, `\`, caracteres de controle (`\x00-\x1f\x7f`) e `/auth/callback`.

## 3. Avaliação de Manipulação de Contexto
- Se um atacante forçar `type=recovery` manualmente sem `code` válido, `exchangeCodeForSession()` falha e redireciona para `/auth/reset-password?error=recovery_link_invalid`, onde o formulário não é exibido.
- **Achado baixo (`REC-03`):** Um usuário já autenticado ou com um `code` válido de confirmação de e-mail poderia alterar o query param `type=recovery` manualmente antes do callback ser processado, sendo direcionado para `/auth/reset-password`. O impacto decorre principalmente do achado `REC-01` (aceitação de sessão comum sem verificação de AMR `recovery`).
