# VEXOR — Etapa 10.3.1: Auditoria da Timeline Social

## 1. Compatibilidade com `topics`, `posts`, `votes`, `categories` e `tags`
- **Reaproveitamento de `topics` + `posts`:** Aprovado com ressalvas. `topics` já possui `status content_status default 'published'`, `category_id`, `topic_tags`, `search_vector` e `posts`.
- **[MEDIUM] Quebra de contrato se `topics.title` virar opcional:** `TIMELINE-ARCHITECTURE.md` sugeriu permitir título opcional/curto em `'note'`/`'tool_share'`. Porém `topics.title` é `NOT NULL` com `check (char_length(title) between 5 and 200)` em `20261110000001_schema.sql:183,198`, usado em `search_vector`, `forum-service.ts` e `admin-server-handlers.ts`. **Correção:** manter `title` obrigatório (`5..200` chars) ou gerar título automático no composer se for nota curta.

## 2. `topic_votes` e Consistência Concorrente de `vote_count`
- **Necessidade de `topic_votes`:** Confirmada. `public.votes` tem `post_id not null references public.posts(id)` (`20261110000001_schema.sql:258`), não aceitando `topic_id`.
- **Consistência concorrente:** Atualizar `topics.vote_count = vote_count + 1` / `greatest(vote_count - 1, 0)` dentro de trigger `AFTER INSERT OR DELETE` `SECURITY DEFINER` (`set search_path = ''`) é atômico por row-lock do PostgreSQL (mesmo padrão de `on_vote_changed()` em `20261110000002_functions_triggers.sql:289-307`), desde que `vote_count` **nunca** receba `GRANT INSERT/UPDATE` para `authenticated` e possua `check (vote_count >= 0)`.

## 3. Paginação por Cursor e Visibilidade
- **[MEDIUM] Cursor apenas por timestamp causa perda/duplicação:** `TIMELINE-ARCHITECTURE.md` propõe cursor por `created_at` ou `last_activity_at`. Em alta concorrência, empates de timestamp pulam ou duplicam itens. **Correção:** usar keyset composto `(created_at, id) < (p_ts, p_id)` com índice `(created_at desc, id desc) where status = 'published'`.
- **[HIGH] `anon` ainda tem `SELECT` em `topics` e `posts` no Postgres:** Em `20261110000003_rls_and_grants.sql:79-80,212,267`, `anon` possui `GRANT SELECT` e `topics_select` / `posts_select` permitem `anon` ler conteúdo publicado via PostgREST direto. Para alinhar o banco à Etapa 10.2, revogar `SELECT` de `anon` em `topics`, `posts`, `resources`, `tags`, `topic_tags` e `categories` (ou restringir policies para `to authenticated` onde aplicável).
