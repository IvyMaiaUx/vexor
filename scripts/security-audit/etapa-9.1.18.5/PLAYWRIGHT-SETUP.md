# Configuração do Playwright — Etapa 9.1.18.5

## 1. Dependência e Navegador
- `@playwright/test` adicionado em `devDependencies` (`package.json` e `package-lock.json`).
- Navegador instalado: `chromium` (`npx playwright install chromium`).

## 2. Scripts adicionados em `package.json`
- `test:e2e`: `playwright test`
- `test:e2e:ui`: `playwright test --ui`
- `test:e2e:report`: `playwright show-report`

## 3. Arquivos de Configuração e Ambiente
- `playwright.config.ts`:
  - `testDir: "./e2e"`
  - `workers: 1` e `fullyParallel: false` para evitar corrida entre sessões de login/logout/perfil.
  - Projeto único `chromium` (`devices["Desktop Chrome"]`).
  - `webServer` apontando para `http://localhost:3000` (ou `E2E_BASE_URL`) com `reuseExistingServer: true`.
  - Artefatos em falha: `trace: "on-first-retry"`, `screenshot: "only-on-failure"`, `video: "retain-on-failure"`.
- `.env.e2e.example`: modelo seguro com `E2E_BASE_URL`, `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_ALLOW_EMAILS=false`, `E2E_ALLOW_PASSWORD_CHANGE=false`, `E2E_SIGNUP_EMAIL` e `E2E_SIGNUP_USERNAME`.
- `.gitignore`: protege `.env.e2e.local`, `playwright-report/`, `test-results/` e `playwright/.auth/`, mantendo `!.env.e2e.example`.
