# TEST RESULTS — ETAPA 9.1.18.1

Data: 2026-11-14  
Escopo: Execução das suítes offline existentes de cadastro, login, sessão, recuperação e perfil, além de TypeScript e ESLint (sem modificar código nem repetir operações remotas).

---

## 1. Suítes Automatizadas Executadas

| Suíte | Tipo | Exit Code | Resultado Observado |
| --- | --- | --- | --- |
| `node scripts/test-register-etapa9-1-13.mjs` | Offline (mocks + regex estática) | `1` (Falhou) | Tests 1–11 passaram; falhou na asserção regex `/signInWithIdentifier/` contra `src/app/login/page.tsx` (refatorada na Etapa 9.1.14 para `loginWithSupabase`). |
| `node scripts/test-login-etapa9-1-14.mjs` | Offline (mocks + regex estática) | `1` (Falhou) | Tests 1–9 passaram; falhou na asserção regex `/getAuthenticatedSessionContext/` contra `src/app/api/auth/session/route.ts` (refatorada na Etapa 9.1.15 para `resolveServerSession`). |
| `node scripts/test-session-auth-etapa9-1-15.mjs` | Offline (mocks + SSR + runtime routes) | `0` (Passou) | Todos os testes das Etapas 9.1.15 e 9.1.15.2.2 passaram (sessão, `getUser()`, single-flight, `syncEpoch`, `/api/auth/logout`, layouts `/admin` e `/cybercrime-research`, `SignOutErrorBanner`). |
| `node scripts/test-password-recovery-etapa9-1-16.mjs` | Offline (mocks + SSR) | `0` (Passou) | Todos os testes de recuperação, callback PKCE, validação `amr: recovery`, `updatePasswordWithSupabase` e regressão de `loginWithSupabase` / `registerWithSupabase` passaram. |
| `node scripts/test-recovery-ui-etapa9-1-16-2.mjs` | SSR React | `0` (Passou) | `ForgotPasswordPage` e `AuthResetPasswordPage` SSR gate checks passaram. |
| `node scripts/test-profile-integration-etapa9-1-17.mjs` | Offline (mocks) | `0` (Passou) | Leitura, atualização, proteção de campos proibidos, `PROF-AUD-01` e `PROF-AUD-02` passaram. |

---

## 2. Tipagem e Lint

| Comando | Exit Code | Resultado Observado |
| --- | --- | --- |
| `npx tsc --noEmit` | `0` | Sem erros de TypeScript. |
| `npm run lint` | `0` | `0 errors, 2 warnings` (2 warnings pré-existentes de variável `e` não utilizada em `scripts/security-audit/run-all-tests.mjs`). |

---

## 3. Distinção Entre Tipos de Evidência

- **Testes manuais informados pelo usuário (Supabase remoto real):** cadastro com confirmação de e-mail, login, logout, recuperação/redefinição de senha, link expirado/inválido e edição de perfil.
- **Testes automatizados executados pela IDE:** todos os scripts acima são **offline com mocks / SSR local** e **não executam chamadas contra o Supabase remoto**.
