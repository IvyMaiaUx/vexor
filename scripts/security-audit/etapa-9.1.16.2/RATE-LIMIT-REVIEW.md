# RATE-LIMIT-REVIEW — Etapa 9.1.16.2 (`REC-02`)

## 1. Revisão do Tratamento de `429` (`rate_limited`)
- Em `src/features/auth/recovery-service.ts`, `requestPasswordRecovery()` captura `error.status === 429 || code.includes("rate_limit")` e retorna `{ status: "error", errorCode: "rate_limited" }`.
- A UI (`src/app/forgot-password/page.tsx`) exibe apenas a mensagem i18n neutra `dict.auth.errors.rateLimited` (*"Muitas tentativas em sequência. Aguarde alguns instantes antes de tentar novamente."*), sem expor mensagens internas ou códigos do Supabase/GoTrue.
- Erros de lookup de conta (como `user_not_found`) continuam retornando `{ status: "dispatched" }`, preservando a proteção anti-enumeração sem implementar rate limiter próprio paralelo.
