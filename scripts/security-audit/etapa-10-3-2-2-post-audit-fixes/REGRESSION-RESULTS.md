# RESULTADOS DE REGRESSÃO — ETAPA 10.3.2.2

Todas as verificações de tipo, lint e as 7 suítes de regressão passaram com **exit code `0`** após as correções em `test-supabase-infra-etapa9-1.mjs` e `test-research-backend-etapa9-7-2a.mjs`:

| Verificação / Script | Resultado |
|---|---|
| `npx tsc --noEmit` | **PASS (exit 0)** |
| `npx eslint src --max-warnings=0` | **PASS (exit 0)** |
| `scripts/test-supabase-infra-etapa9-1.mjs` | **PASS (7/7, 5 migrations em ordem)** |
| `scripts/test-catalog-integration-etapa9-3.mjs` | **PASS (5/5)** |
| `scripts/test-forum-integration-etapa9-4.mjs` | **PASS (20/20)** |
| `scripts/test-notifications-reports-etapa9-5.mjs` | **PASS (25/25)** |
| `scripts/test-admin-supabase-etapa9-6.mjs` | **PASS (31/31)** |
| `scripts/test-research-backend-etapa9-7-2a.mjs` | **PASS (12/12)** |
| `scripts/test-access-control-etapa10-2.mjs` | **PASS (17/17)** |
