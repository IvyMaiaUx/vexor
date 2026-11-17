# Configuração do Playwright — Etapa 9.1.18.5.1

## Inspeção de `playwright.config.ts`
- `testDir`: `./e2e`
- `workers`: `1` e `fullyParallel: false` (execução sequencial para evitar conflito de sessão)
- `projects`: apenas `chromium` (`devices["Desktop Chrome"]`)
- `use.baseURL`: `process.env.E2E_BASE_URL?.trim() || "http://localhost:3000"`
- `webServer`:
  - `command`: `"npm run dev"`
  - `url`: `baseURL` (`http://localhost:3000`)
  - `reuseExistingServer`: `true`
  - `timeout`: `120_000`

## Avaliação e Decisão
- Com a porta `3000` e `.next/dev/lock` livres, o `webServer` do Playwright iniciou o `next dev` no mesmo contexto de execução dos testes e respondeu corretamente em `http://localhost:3000`.
- **Nenhuma alteração em `playwright.config.ts` foi necessária.**
