# AMBIENTE DE TESTE LOCAL — ETAPA 10.3.2.2

- **Cluster:** `.pg_test_cluster` (PostgreSQL 18, porta `5433`)
- **Banco temporário exclusivo desta etapa:** `vexor_etapa10_3_2_2`
- **Ordem aplicada:** `postgres_bootstrap.sql` → 5 migrations oficiais (inalteradas) → `PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql` → suítes de teste (`run-revision-2-tests.sql` e `run-isolated-pg-tests.sql`) + testes paralelos.
- **Limpeza:** `DROP DATABASE IF EXISTS vexor_etapa10_3_2_2;` e `pg_ctl stop` executados ao término de cada bateria. Nenhuma alteração foi feita no Supabase remoto (`zcjudcbckcxwnfnrjfte`).
