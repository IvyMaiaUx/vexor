# VALIDAÇÃO POSTGRESQL 17 — ETAPA 10.3.3.2

- **Ambiente local executado:** PostgreSQL `18` (`.pg_test_cluster`, porta `5433`, banco temporário `vexor_etapa10_3_3_2`, descartado ao final).
- **PostgreSQL 17.11 local:** Não disponível neste host (não foi feita compensação usando o banco remoto).
- **Validação estática para PostgreSQL 17.11.0.019:** Todas as construções da candidata `20261117234500_social_community.sql` (`ALTER TYPE ... ADD VALUE IF NOT EXISTS` fora de `BEGIN`, `num_nonnulls`, `hashtextextended`, `FOR NO KEY UPDATE`, `FOR SHARE NOWAIT`, `FOR UPDATE OF w NOWAIT`, índices parciais, `SECURITY DEFINER`, `SET search_path = ''`) são padrão PG 12–16 e não utilizam recursos exclusivos do PG 18.
- **Pendentes de runtime:** Execução em instância PG 17.11 (ocorrerá apenas na aplicação oficial quando autorizada) e testes WebSocket do Supabase Realtime na Fase B.
