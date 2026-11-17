# Etapa 9.1.11 — Dependencies and Environment Audit

- **Data:** 2026-11-13
- **Escopo:** `package.json`, `package-lock.json`, `next.config.ts`, variáveis de ambiente e organização de arquivos Supabase.

## 1. Versões instaladas e travadas (`package.json` / `package-lock.json`)

| Pacote | Range (`package.json`) | Versão travada (`package-lock.json`) | Avaliação |
|---|---|---|---|
| `next` | `16.4.6` | `16.4.6` | Compatível com `src/proxy.ts` e `await cookies()` |
| `react` / `react-dom` | `19.3.0` | `19.3.0` | Compatível |
| `@supabase/ssr` | `^0.12.7` | `0.12.7` | Atual e compatível com Next.js 16 |
| `@supabase/supabase-js` | `^2.119.0` | `2.119.0` | Atual e compatível |
| `typescript` | `^5` | — | Compatível |
| `supabase` (CLI devDep) | `^3.1.0` | — | Presente |

- **Dependências ausentes:** Não há framework de testes unitários/E2E (`vitest`, `playwright`) instalado caso se deseje suíte automatizada além de scripts Node.js (`scripts/*.mjs`).
- **Dependências duplicadas ou conflitantes:** Nenhuma identificada.

## 2. Variáveis de ambiente

Nomes presentes em `.env.local` (sem exibição de valores):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_DEFAULT_LOCALE`

Observações:
- `.gitignore` protege `.env.*` preservando `!.env.example`.
- Não há `SUPABASE_SERVICE_ROLE_KEY` no frontend — o que é positivo para evitar exposição acidental.

## 3. Configuração Next.js (`next.config.ts`) e organização Supabase

- `next.config.ts` encontra-se mínima (`const nextConfig: NextConfig = {};`). Para uso futuro de avatares hospedados no Storage (`https://zcjudcbckcxwnfnrjfte.supabase.co/storage/v1/object/public/avatars/...`) com `next/image`, será necessário configurar `images.remotePatterns`.
- Clientes Supabase isolados em `src/lib/supabase/client.ts` e `src/lib/supabase/server.ts`, e tipagem gerada em `src/types/database.types.ts`.
