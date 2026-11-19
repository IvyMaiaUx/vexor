# RESULTADOS DE REGRESSÃO — ETAPA 10.3.2 (FASE A)

## 1. Typecheck e Lint
| Verificação | Comando | Resultado |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | **PASS (exit 0)** |
| ESLint | `npx eslint src --max-warnings=0` | **PASS (exit 0)** |

## 2. Suítes de Regressão Executadas (`scripts/test-*.mjs`)
| Script | Resultado | Observação |
|---|---|---|
| `scripts/test-catalog-integration-etapa9-3.mjs` | **PASS (exit 0)** | 5/5 cenários aprovados |
| `scripts/test-forum-integration-etapa9-4.mjs` | **PASS (exit 0)** | Todos os 20 cenários aprovados |
| `scripts/test-notifications-reports-etapa9-5.mjs` | **PASS (exit 0)** | Todos os 25 cenários aprovados |
| `scripts/test-admin-supabase-etapa9-6.mjs` | **PASS (exit 0)** | 31/31 cenários aprovados |
| `scripts/test-access-control-etapa10-2.mjs` | **PASS (exit 0)** | Todos os cenários de controle de acesso aprovados |
| `scripts/test-supabase-infra-etapa9-1.mjs` | **FAIL (exit 1)** | Falha esperada apenas no item `[7/7]` (`Exatamente 3 migrações existentes (encontrado: 5)` devido às migrations `20261113143000` e `20261116114600` já presentes antes da Etapa 10.3.2); itens `[1/7]`..`[6/7]` e preservação das 3 originais passaram |
| `scripts/test-research-backend-etapa9-7-2a.mjs` | **FAIL (exit 1)** | Checks 01–06 passaram; check 07 retornou `500 !== 200` (linha 239) porque a migration `20261116114600_research_submissions.sql` permanece pendente de aplicação no Supabase remoto |

## 3. Integridade do Repositório
- Zero arquivos alterados em `src/` ou `supabase/migrations/`.
- Zero alterações no Supabase remoto (`zcjudcbckcxwnfnrjfte`).
