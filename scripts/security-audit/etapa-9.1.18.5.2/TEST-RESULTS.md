# Resultados das Validações — Etapa 9.1.18.5.2

## 1. Teste Específico de Login (`npx playwright test e2e/auth/login.spec.ts`)
- **Aprovados:** **3**
  - `exibe os campos e botão de entrada na página de login` (4.8s)
  - `valida campos vazios e formato inválido sem quebrar a página` (2.0s)
  - `exibe erro genérico seguro ao tentar login com credenciais inválidas` (2.2s)
- **Falhos:** **0**
- **Ignorados (skipped):** **1**
  - `realiza login válido, redireciona e mantém sessão ativa` (`E2E_EMAIL` e `E2E_PASSWORD` ausentes)

## 2. Suíte Playwright Completa (`npm run test:e2e`)
- **Aprovados:** **13** (47.2s)
  - `auth/login.spec.ts`: 3 aprovados
  - `auth/protected-routes.spec.ts`: 4 aprovados (`/admin*`, `/cybercrime-research`, rotas públicas `/`, `/login`, `/register`, `/profile` anônimo)
  - `auth/recovery.spec.ts`: 3 aprovados (`/forgot-password` e-mail inválido, `/auth/reset-password` com `?error=recovery_link_invalid` e sem sessão)
  - `auth/register.spec.ts`: 3 aprovados (campos do formulário, validação de campos vazios, divergência de senha + aceite ético sem envio)
- **Falhos:** **0**
- **Ignorados (skipped):** **7**
  - `auth/login.spec.ts`: login válido (sem `E2E_EMAIL`/`E2E_PASSWORD`)
  - `auth/logout.spec.ts`: logout real (sem `E2E_EMAIL`/`E2E_PASSWORD`)
  - `auth/recovery.spec.ts`: bloqueio de sessão comum em `/auth/reset-password` (sem `E2E_EMAIL`/`E2E_PASSWORD`), envio real de recuperação (`E2E_ALLOW_EMAILS !== 'true'`), alteração real de senha (`E2E_ALLOW_PASSWORD_CHANGE !== 'true'`)
  - `auth/register.spec.ts`: cadastro real com confirmação (`E2E_ALLOW_EMAILS !== 'true'` / sem `E2E_SIGNUP_EMAIL`)
  - `profile/profile-edit.spec.ts`: edição/persistência de perfil (sem `E2E_EMAIL`/`E2E_PASSWORD`)

## 3. Suítes Node de Regressão (Autenticação, Sessão, Recuperação e Perfil)
Todas as **7 suítes** executadas passaram com `exit code 0`:
- `scripts/test-register-etapa9-1-13.mjs` — **PASSED**
- `scripts/test-login-etapa9-1-14.mjs` — **PASSED**
- `scripts/test-session-endpoint-etapa9-1-18-4.mjs` — **PASSED**
- `scripts/test-session-auth-etapa9-1-15.mjs` — **PASSED** (inclui 9.1.15.2.2)
- `scripts/test-password-recovery-etapa9-1-16.mjs` — **PASSED**
- `scripts/test-recovery-ui-etapa9-1-16-2.mjs` — **PASSED**
- `scripts/test-profile-integration-etapa9-1-17.mjs` — **PASSED**

## 4. TypeScript e ESLint
- `npx tsc --noEmit`: **0 erros**
- `npx eslint .`: **0 erros** (2 warnings pré-existentes em `scripts/security-audit/run-all-tests.mjs`)

## 5. Não Executados
- Testes E2E autenticados/remotos que exigem conta dedicada em `.env.e2e.local`, `E2E_ALLOW_EMAILS=true` ou `E2E_ALLOW_PASSWORD_CHANGE=true` (permaneceram ignorados conforme restrições de segurança).
