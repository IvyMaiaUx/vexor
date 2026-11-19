# COMPATIBILIDADE POSTGRESQL 17.11 — REVISÃO 2

- **Classificação:** **Estática revisada, runtime pendente** (`AUD-REV2-03`).
- **Motivo:** Apenas PostgreSQL `18` está instalado localmente (`C:\Program Files\PostgreSQL\18`). Não há instância PostgreSQL `17.11` disponível localmente e não foi executado nenhum comando remoto.
- **Análise estática dos novos itens da Revisão 2:**
  - `reports_dm_message_id_pair check ((message_snapshot_id is null) = (message_id is null))`: SQL padrão PG 9+.
  - `create unique index ... where message_id is not null and status in ('open', 'reviewing')`: índice parcial padrão PG 7.2+.
  - `create index ... on public.direct_messages (sender_id, created_at desc) where sender_id is not null`: índice parcial padrão.
  - `for update of w nowait` + `for share nowait`: PG 9.0+.
  - `greatest(coalesce(last_read_at, '-infinity'::timestamptz), now())`: PG 8.4+.
  - Nenhum recurso exclusivo do PostgreSQL 18 foi utilizado.
