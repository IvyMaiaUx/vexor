# Inventário de Ambiente Local e E2E — Etapa 9.1.18.6.1

> Nenhum segredo, chave de API, token, senha ou identificador pessoal é exibido neste documento.

## 1. Configuração do Frontend (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`: aponta para o host `zcjudcbckcxwnfnrjfte.supabase.co` (**Project Reference:** `zcjudcbckcxwnfnrjfte`).
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: definida (`SET=True`).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: definida (`SET=True`).
- `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000`.
- `NEXT_PUBLIC_DEFAULT_LOCALE`: definida (`SET=True`).

## 2. Configuração do Supabase CLI
- `supabase/config.toml`: `project_id = "zcjudcbckcxwnfnrjfte"`.
- `supabase/.temp/project-ref`: `zcjudcbckcxwnfnrjfte`.
- `npx supabase migration list --remote`: vinculado ao projeto `Vexor` (`zcjudcbckcxwnfnrjfte`, ambiente `production`).

## 3. Configuração do Playwright (`playwright.config.ts`, `e2e/helpers/env.ts`, `.env.e2e.example`)
- `playwright.config.ts` utiliza `baseURL = process.env.E2E_BASE_URL || "http://localhost:3000"` e inicia/reutiliza `npm run dev` (que consome `.env.local`).
- Portanto, o Playwright testa a aplicação conectada ao mesmo projeto Supabase (`zcjudcbckcxwnfnrjfte`).
- `.env.e2e.local`: **não existe** (`exists = false`).
- Variáveis E2E esperadas (conforme `.env.e2e.example` e `e2e/helpers/env.ts`): `E2E_BASE_URL`, `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_ALLOW_EMAILS=false`, `E2E_ALLOW_PASSWORD_CHANGE=false`, `E2E_SIGNUP_EMAIL`, `E2E_SIGNUP_USERNAME`. Todas as variáveis opcionais de credenciais e efeitos colaterais encontram-se ausentes/desativadas.

## 4. Conclusão de Alinhamento
- **Divergência entre frontend, Playwright e Supabase CLI:** **nenhuma**. Todos apontam para `zcjudcbckcxwnfnrjfte`.
