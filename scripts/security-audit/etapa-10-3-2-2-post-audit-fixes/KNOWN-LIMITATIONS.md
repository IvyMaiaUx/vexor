# LIMITAÇÕES CONHECIDAS — ETAPA 10.3.2.2

1. **PostgreSQL 17.11 vs 18:** Os testes runtime continuam executados em PostgreSQL 18 local (`.pg_test_cluster`, porta `5433`), pois não há instância local do PostgreSQL 17.11 neste host. A compatibilidade com PG 17.11 foi validada por análise estática (sem recursos exclusivos do PG 18).
2. **Supabase Realtime:** Eventos WebSocket em produção dependem do servidor Realtime do Supabase e serão validados na Fase B após aprovação.
3. **Aplicação (`src/`) e banco remoto (`zcjudcbckcxwnfnrjfte`):** Intocados nesta etapa por regra de escopo.
