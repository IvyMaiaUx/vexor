# REGRESSION RESULTS — ETAPA 9.1.18.2

Data: 2026-11-14  
Escopo: Execução completa das suítes de regressão, TypeScript e ESLint após atualização dos scripts `scripts/test-register-etapa9-1-13.mjs` e `scripts/test-login-etapa9-1-14.mjs`.

---

| Comando | Exit Code | Resultado Observado |
| --- | --- | --- |
| `node scripts/test-register-etapa9-1-13.mjs` | `0` | Tests 1–12 passaram (`ALL ETAPA 9.1.13 TESTS PASSED`). |
| `node scripts/test-login-etapa9-1-14.mjs` | `0` | Tests 1–10 passaram (`ALL ETAPA 9.1.14 TESTS PASSED`). |
| `node scripts/test-session-auth-etapa9-1-15.mjs` | `0` | Tests 1–16 e Runtime Tests A–C passaram (`ALL ETAPA 9.1.15 TESTS PASSED`). |
| `node scripts/test-password-recovery-etapa9-1-16.mjs` | `0` | Recovery Request, Callback, Recovery Session AuthZ, Regressão e SSR passaram (`ALL ETAPA 9.1.16.2 TESTS PASSED`). |
| `node scripts/test-recovery-ui-etapa9-1-16-2.mjs` | `0` | `ForgotPasswordPage` e `AuthResetPasswordPage` SSR render/gate checks passaram. |
| `node scripts/test-profile-integration-etapa9-1-17.mjs` | `0` | Profile read/update/security, `PROF-AUD-01` e `PROF-AUD-02` passaram (`ALL ETAPA 9.1.17 PROFILE TESTS PASSED`). |
| `npx tsc --noEmit` | `0` | Sem erros de TypeScript. |
| `npm run lint` | `0` | `0 errors, 2 warnings` (2 warnings pré-existentes em `scripts/security-audit/run-all-tests.mjs`). |
