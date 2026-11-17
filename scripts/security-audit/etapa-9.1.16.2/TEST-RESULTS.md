# TEST-RESULTS — Etapa 9.1.16.2

## 1. Comparação com a Etapa 9.1.16.1

| Verificação | 9.1.16.1 | 9.1.16.2 | Resultado Observado |
|-------------|----------|----------|---------------------|
| `node scripts/test-password-recovery-etapa9-1-16.mjs` | Exit code `0` | Exit code `0` | Passou com cobertura ampliada: `hasRecoveryAmrClaim`, rejeição de sessão comum (`amr: password`), ausência de `amr`, `oauth`, `sub` divergente, `exp` expirado, `weak_password`, `same_password`, exceção no callback, regressão `login`/`register` e execução de `test-recovery-ui-etapa9-1-16-2.mjs` (`ForgotPasswordPage` e `AuthResetPasswordPage` SSR gates). |
| `node scripts/test-session-auth-etapa9-1-15.mjs` | Exit code `0` | Exit code `0` | Todos os 17 blocos originais + `Runtime Test A`, `Runtime Test B`, `Runtime Test C` aprovados. |
| `npx tsc --noEmit` | Exit code `0` | Exit code `0` | Sem erros de tipagem. |
| `npm run lint` | Exit code `0` (0 erros, 2 warnings) | Exit code `0` (0 erros, 2 warnings) | `0` erros e apenas os `2` warnings pré-existentes em `scripts/security-audit/run-all-tests.mjs` (`156:16`, `193:44`). |
| `npx next build --webpack` | *Não executado* | *Não executado* | Pendente ambiental conhecido (`EPERM` em `.next` por ACL do sandbox). |
