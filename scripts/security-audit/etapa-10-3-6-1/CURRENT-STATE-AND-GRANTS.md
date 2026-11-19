# ESTADO ATUAL E GRANTS EM `public.topics` — ETAPA 10.3.6.1

## 1. Estrutura e Grants Anteriores (`POST-01` Confirmado)
- Na migration `20261110000003_rls_and_grants.sql:102-104`:
  - `grant insert (category_id, title, body) on public.topics to authenticated;`
  - `grant update (category_id, title, body) on public.topics to authenticated;`
  - `grant delete on public.topics to authenticated;`
- Não há grant de tabela para `INSERT` (proteção estrita por coluna).
- A migration `20261117234500_social_community.sql` adicionou `kind`, `shared_url`, `resource_id` e `vote_count`, porém sem conceder `GRANT INSERT` para `kind`, `shared_url` e `resource_id`.

## 2. Policies e Constraints Preservadas
- `topics_insert_member`: exige `is_active_member()`, `author_id = auth.uid()`, `status = 'published'` e categoria ativa de escopo `'forum'`/`'both'`.
- Constraints: `topics_title_len` (`5..200`), `topics_body_len` (`10..20000`), `topics_shared_url_scheme` (`^https?://...`, `<= 2048`), `topics_votes_nonneg` (`vote_count >= 0`).
- Campos administrativos (`id`, `author_id`, `status`, `created_at`, `updated_at`, `vote_count`, `is_pinned`, `is_locked`, `accepted_post_id`, `search_vector`) permanecem protegidos contra escrita direta.
