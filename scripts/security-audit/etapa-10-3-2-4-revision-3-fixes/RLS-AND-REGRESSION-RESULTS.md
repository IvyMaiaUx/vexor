# RESULTADOS DE RLS E REGRESSÕES — ETAPA 10.3.2.4

## 1. Testes SQL e RLS (PostgreSQL 18 Isolado, `vexor_etapa10_3_2_4`)
- `run-revision-2-tests.sql` (`AUD-SEC-01`..`05`): **4/4 blocos aprovados** sob roles reais (`anon` e `authenticated`).
- `run-revision-3-tests.sql` (`AUD-REV2-02`): **aprovado** (`published` permitido; `hidden`, `deleted` e inexistente → `P0002` uniforme; externo e suspenso → `42501`; zero snapshot órfão).

## 2. Regressões da Aplicação (Todos com Exit Code `0`)
| Verificação / Script | Resultado |
|---|---|
| `npx tsc --noEmit` | **PASS (exit 0)** |
| `npx eslint src --max-warnings=0` | **PASS (exit 0)** |
| `scripts/test-supabase-infra-etapa9-1.mjs` | **PASS (7/7)** |
| `scripts/test-catalog-integration-etapa9-3.mjs` | **PASS (5/5)** |
| `scripts/test-forum-integration-etapa9-4.mjs` | **PASS (20/20)** |
| `scripts/test-notifications-reports-etapa9-5.mjs` | **PASS (25/25)** |
| `scripts/test-admin-supabase-etapa9-6.mjs` | **PASS (31/31)** |
| `scripts/test-research-backend-etapa9-7-2a.mjs` | **PASS (12/12)** |
| `scripts/test-access-control-etapa10-2.mjs` | **PASS (17/17)** |
