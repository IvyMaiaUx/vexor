# COMPATIBILIDADE POSTGRESQL 17.11 — ETAPA 10.3.3.1

## 1. Alvo e Metodologia
- **Alvo remoto:** PostgreSQL `17.11.0.019` (Supabase Free).
- **Ambiente local disponível:** PostgreSQL `18` (`.pg_test_cluster`, porta `5433`).
- **Classificação:** **Estática revisada, runtime em PG 17.11 pendente** (testes runtime executados exclusivamente em PG 18 local; nenhuma escrita no remoto).

## 2. Análise Técnica por Recurso na Revisão 3 (`B6D625AB6284F48886F030D96AA0142A54380A92D0EA039433724AB8BCC59FBE`)
| Recurso SQL / PL/pgSQL | Disponibilidade PG 17.11 | Risco / Observação |
|---|---|---|
| `ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS ...` fora de `BEGIN` | PG 12+ | Compatível. Mesmo padrão já aplicado com sucesso na migration `20261116114600` no próprio remoto. |
| `CREATE TYPE ... AS ENUM` dentro de `DO $$` | PG 9.1+ | Compatível. |
| Índices parciais (`WHERE status = 'published'`, `WHERE sender_id IS NOT NULL`, etc.) | PG 7.2+ | Compatível. |
| `num_nonnulls(...)` em `reports_one_target` | PG 9.6+ | Compatível; detecta dinamicamente `research_id` (presente no remoto). |
| `hashtextextended(text, bigint)` + `pg_advisory_xact_lock(bigint)` | PG 11+ | Compatível. |
| `pg_catalog.regexp_matches(body, '@([a-z0-9_]{3,30})', 'gi')` | PG 8.3+ | Compatível. |
| `FOR SHARE NOWAIT`, `FOR UPDATE NOWAIT`, `FOR UPDATE OF w NOWAIT`, `FOR NO KEY UPDATE` | PG 9.3+ | Compatível; sem dependência de recursos PG 18. |
| `greatest(last_message_at, now())` | PG 8.4+ | Compatível. |
| `SECURITY DEFINER`, `SET search_path = ''`, `(select auth.uid())` em RLS | PG 9.5+ | Compatível e alinhado às boas práticas do Supabase PG 17. |
| Recursos exclusivos do PG 18 (`UUIDv7`, `WITHOUT OVERLAPS`, etc.) | Não utilizados | Zero incompatibilidade sintática prevista. |
