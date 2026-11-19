# COMPATIBILIDADE POSTGRESQL 17.11 E SUPABASE — ETAPA 10.3.3.3

- **Compatibilidade Estática PG 17.11:** Revisada integralmente — 0 recursos exclusivos do PG 18 (`ALTER TYPE ... ADD VALUE IF NOT EXISTS` fora de `BEGIN`, índices parciais, `FOR NO KEY UPDATE`, `FOR SHARE NOWAIT`, `FOR UPDATE OF w NOWAIT`, `num_nonnulls`, `hashtextextended`, `SECURITY DEFINER`, `SET search_path = ''`).
- **Testes Runtime PG 18:** Executados em `.pg_test_cluster` (Etapas 10.3.2.4, 10.3.2.5 e 10.3.3.2).
- **Testes Runtime PG 17:** **Não executados** (ausência de instância PG 17 local).
- **Testes Reais Supabase:** `npx supabase migration list --remote` (`exit 0`) e `npx supabase db push --remote --dry-run --skip-vault` (`exit 0`, 1 migration pendente).
- **Testes WebSocket Realtime:** **Pendentes** para a Fase B após habilitação em `supabase_realtime`.
