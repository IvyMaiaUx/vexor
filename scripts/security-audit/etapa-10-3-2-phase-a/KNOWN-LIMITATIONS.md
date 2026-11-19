# LIMITAÇÕES CONHECIDAS — ETAPA 10.3.2 (FASE A)

1. **Ambiente de emulação local:** Os testes SQL rodaram em PostgreSQL 18 local (`.pg_test_cluster`, porta `5433`) com `postgres_bootstrap.sql` emulando `auth.users`, `auth.uid()` e `auth.role()`. Comportamentos exclusivos do serviço Supabase Realtime (WebSocket broadcast/presence em produção) não são executados em `psql` puro e serão validados na Fase B após aplicação aprovada.
2. **Código TypeScript ainda não atualizado (por regra de escopo):** Nenhum arquivo em `src/` foi alterado nesta Fase A. Consequentemente, rotas e services atuais ainda não consomem `topic_votes`, `user_warnings`, `direct_conversations` ou `dm_report_snapshots`.
3. **Banco remoto intocado:** O projeto Supabase remoto (`zcjudcbckcxwnfnrjfte`) permanece inalterado; `20261116114600_research_submissions.sql` e `PROPOSED-SOCIAL-MIGRATION.sql` não foram aplicados remotamente.
4. **Scripts de regressão que dependem de servidor/Supabase remoto:** Qualquer script em `scripts/test-*.mjs` que exija credenciais remotas ou servidor Next ativo reflete o estado atual da aplicação (sem alterações da Fase B).
