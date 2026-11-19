# AMBIENTE DE TESTE LOCAL ISOLADO

## Especificação do Ambiente
- **Motor:** PostgreSQL 18 (`C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe` e `psql.exe`)
- **Cluster isolado:** `.pg_test_cluster` na raiz do repositório, porta `5433`
- **Banco temporário:** `vexor_etapa10_3_2` (criado do zero para cada execução e removido com `DROP DATABASE IF EXISTS vexor_etapa10_3_2;` ao término, com parada do cluster via `pg_ctl stop`)
- **Bootstrap:** [postgres_bootstrap.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/supabase/tests/postgres_bootstrap.sql) (emula roles `anon`, `authenticated`, tabela `auth.users` e helpers `auth.uid()`, `auth.role()`)

## Isolamento
- Nenhum acesso ao Supabase remoto (`zcjudcbckcxwnfnrjfte`).
- Nenhuma variável `.env` de produção usada nos testes SQL.
- Execução estrita com `psql -v ON_ERROR_STOP=1`.
