# REGRESSION RESULTS — ETAPA 9.1.18.3 (SOMENTE LEITURA)

Data: 2026-11-14  
Escopo: Execução somente leitura de todas as suítes, TypeScript e ESLint, sem alterar arquivos nem executar operações remotas.

---

| Comando | Exit Code | Resultado Observado | Escopo / Limitação |
| --- | --- | --- | --- |
| `node scripts/test-register-etapa9-1-13.mjs` | `0` | Tests 1–12 passaram (`ALL ETAPA 9.1.13 TESTS PASSED`). | Mocks offline + verificação estática em arquivos. Não testa Supabase remoto. |
| `node scripts/test-login-etapa9-1-14.mjs` | `0` | Tests 1–10 passaram (`ALL ETAPA 9.1.14 TESTS PASSED`). | Mocks offline + verificação estática em `session/route.ts`. Não testa Supabase remoto. |
| `node scripts/test-session-auth-etapa9-1-15.mjs` | `0` | Tests 1–16 e Runtime Tests A–C passaram (`ALL ETAPA 9.1.15 TESTS PASSED`). | Mocks offline + SSR + execução direta de `/api/auth/logout` e layouts. |
| `node scripts/test-password-recovery-etapa9-1-16.mjs` | `0` | Recovery Request, Callback, Recovery AuthZ, Regressão e SSR passaram (`ALL ETAPA 9.1.16.2 TESTS PASSED`). | Mocks offline + SSR. |
| `node scripts/test-recovery-ui-etapa9-1-16-2.mjs` | `0` | `ForgotPasswordPage` e `AuthResetPasswordPage` SSR render/gate checks passaram. | Renderização SSR isolada. |
| `node scripts/test-profile-integration-etapa9-1-17.mjs` | `0` | Profile read/update/security, `PROF-AUD-01` e `PROF-AUD-02` passaram (`ALL ETAPA 9.1.17 PROFILE TESTS PASSED`). | Mocks offline. |
| `npx tsc --noEmit` | `0` | Sem erros de TypeScript. | Análise estática de tipos. |
| `npm run lint` | `0` | `0 errors, 2 warnings` (2 warnings pré-existentes em `scripts/security-audit/run-all-tests.mjs`). | Análise estática ESLint. |
