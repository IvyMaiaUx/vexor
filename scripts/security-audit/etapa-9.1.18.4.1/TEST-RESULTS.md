# TEST RESULTS — ETAPA 9.1.18.4.1 (AUDITORIA SOMENTE LEITURA)

Data: 2026-11-14

---

## 1. Comandos Executados

| Comando | Exit Code | Resultado Observado | Limitação |
| --- | --- | --- | --- |
| `node scripts/test-register-etapa9-1-13.mjs` | `0` | Tests 1–12 passaram (`ALL ETAPA 9.1.13 TESTS PASSED`). | Mocks offline + inspeção estática em `register/page.tsx`. |
| `node scripts/test-login-etapa9-1-14.mjs` | `0` | Tests 1–11 + `test-session-endpoint-etapa9-1-18-4.mjs` passaram (`ALL ETAPA 9.1.14 TESTS PASSED`). | Mocks offline + inspeção estática em `login/page.tsx`. |
| `node scripts/test-session-endpoint-etapa9-1-18-4.mjs` | `0` | 6 cenários reais do handler `GET /api/auth/session` passaram (`ALL GET /api/auth/session RUNTIME TESTS PASSED`). | `@/lib/supabase/server` mockado via `registerHooks`. |
| `node scripts/test-session-auth-etapa9-1-15.mjs` | `0` | Tests 1–16 e Runtime Tests A–C passaram (`ALL ETAPA 9.1.15 TESTS PASSED`). | Mocks offline + SSR. |
| `node scripts/test-password-recovery-etapa9-1-16.mjs` | `0` | Recovery Request, Callback, Recovery AuthZ, Regressão e SSR passaram (`ALL ETAPA 9.1.16.2 TESTS PASSED`). | Mocks offline + SSR. |
| `node scripts/test-recovery-ui-etapa9-1-16-2.mjs` | `0` | `ForgotPasswordPage` e `AuthResetPasswordPage` SSR render/gate checks passaram. | Renderização SSR isolada. |
| `node scripts/test-profile-integration-etapa9-1-17.mjs` | `0` | Profile read/update/security, `PROF-AUD-01` e `PROF-AUD-02` passaram (`ALL ETAPA 9.1.17 PROFILE TESTS PASSED`). | Mocks offline. |
| `npx tsc --noEmit` | `0` | Sem erros de TypeScript. | Análise estática. |
| `npx eslint .` | `0` | `0 errors, 2 warnings` (2 warnings pré-existentes em `scripts/security-audit/run-all-tests.mjs`). | Análise estática. |

---

## 2. Limitações Ambientais

- `next build` não foi executado (restrição ambiental conhecida de ACL em `.next` no Windows, não alterada).
- Nenhuma operação remota (cadastro real, login real, envio de e-mail, SQL ou Playwright) foi executada nesta auditoria.
