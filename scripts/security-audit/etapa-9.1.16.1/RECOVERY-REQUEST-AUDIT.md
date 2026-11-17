# RECOVERY-REQUEST-AUDIT — Etapa 9.1.16.1

## 1. Arquivos Inspecionados
- `src/features/auth/recovery-service.ts` (`requestPasswordRecovery`)
- `src/app/forgot-password/page.tsx` (`ForgotPasswordPage`)
- `src/lib/supabase/client.ts` (`createClient`)
- `src/lib/security/redirect.ts` (`getSafeRedirectPath`)

## 2. Verificação Ponto a Ponto
- **Uso de `resetPasswordForEmail()` e cliente browser:** `requestPasswordRecovery()` reutiliza `createClient().auth` (`src/lib/supabase/client.ts`), sem criar cliente paralelo.
- **Validação de e-mail:** Aplica `trim().toLowerCase()` e `EMAIL_REGEX` no frontend e no serviço (`recovery-service.ts:93-96`).
- **Anti-enumeração:** Erros de lookup (como `user_not_found`) retornam `{ status: "dispatched" }`, exibindo a mensagem neutra `dict.auth.forgotPasswordPage.antiEnumerationNotice`.
- **Rate limit / Indisponibilidade:** `429` retorna `rate_limited` e erros `5xx` ou exceções de rede retornam `network_error`. *(Observação baixa `REC-02`: se o GoTrue aplicar rate limit por endereço de e-mail, respostas `429` podem diferenciar comportamento sob abuso repetido contra um mesmo e-mail.)*
- **Open Redirect / `redirectTo`:** `nextPath` passa por `getSafeRedirectPath()` e é restrito ao prefixo `/auth/reset-password`, montando `${origin}/auth/callback?type=recovery&next=%2Fauth%2Freset-password`.
- **Armazenamento e logs:** Nenhum token, senha ou link é salvo em `localStorage`, `sessionStorage` ou cookies manuais; nenhum `console.log` com dados sensíveis.
- **Submissões duplicadas:** `handleSubmit` em `src/app/forgot-password/page.tsx` possui guarda `if (isSubmitting) return;` e `disabled={isSubmitting}`.
