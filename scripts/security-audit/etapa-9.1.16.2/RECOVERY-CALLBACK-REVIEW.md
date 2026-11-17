# RECOVERY-CALLBACK-REVIEW — Etapa 9.1.16.2 (`REC-03`)

## 1. Revisão de `src/app/auth/callback/route.ts`
- `type=recovery` serve exclusivamente para selecionar a rota de destino (`/auth/reset-password` ou `/auth/reset-password?error=recovery_link_invalid` em caso de falha).
- A autorização real para redefinir senha **não** depende mais apenas de `type=recovery`: agora depende de `validateRecoverySession()` (`getUser()` + `getClaims()` verificando `amr` contendo `"recovery"`).
- Portanto, mesmo que um usuário adultere `?type=recovery` manualmente em um fluxo de confirmação de e-mail, a página `/auth/reset-password` rejeitará a sessão se o JWT emitido não contiver `amr: recovery`.
- Fluxo de confirmação de e-mail, rejeição de códigos inválidos/reutilizados e bloqueio de open redirects via `getSafeRedirectPath()` permanecem preservados sem duplicar endpoints de callback.
