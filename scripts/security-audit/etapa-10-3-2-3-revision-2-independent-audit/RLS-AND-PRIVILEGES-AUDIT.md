# AUDITORIA DE RLS, PRIVILÉGIOS E SECURITY DEFINER — REVISÃO 2

## 1. Tabelas Novas e Modificadas
Todas as 7 novas tabelas (`topic_votes`, `user_blocks`, `user_warnings`, `direct_conversations`, `direct_conversation_members`, `direct_messages`, `reported_message_snapshots`) têm `ENABLE ROW LEVEL SECURITY` e `REVOKE ALL FROM anon, authenticated` antes das concessões mínimas.

- `topic_votes`: `authenticated` tem `SELECT` (próprio), `INSERT (topic_id)` (ativo, tópico `published`), `DELETE` (próprio, ativo). `anon` sem acesso.
- `user_blocks`: `authenticated` tem `SELECT` (próprio), `INSERT (blocked_id)` (ativo, `<> auth.uid()`), `DELETE` (próprio, ativo).
- `user_warnings`: `authenticated` tem apenas `SELECT` (`user_id = auth.uid()` ou `is_moderator()`). Mutações somente via RPCs.
- `direct_conversations` / `direct_conversation_members`: `authenticated` tem apenas `SELECT` via `is_dm_participant(...)`.
- `direct_messages`: `authenticated` tem apenas `SELECT` via `is_active_member() AND is_dm_participant(conversation_id) AND status = 'published'`.
- `reported_message_snapshots`: nenhum `GRANT` direto para `anon` ou `authenticated`; acesso exclusivo via `get_reported_message_evidence(uuid)` com log em `audit_logs`.
- `topics`, `posts`, `resources`, `categories`, `tags`, `topic_tags`: `SELECT` revogado de `anon`.

## 2. Funções `SECURITY DEFINER`
Todas as funções `SECURITY DEFINER` da Revisão 2 possuem `SET search_path = ''`, referências totalmente qualificadas (`public.*` / `pg_catalog.*`), validação de `auth.uid()`, checagem de suspensão/papel e `REVOKE ALL FROM public, anon`:
- `is_dm_participant(uuid)`: `STABLE`, `authenticated`, retorna apenas booleano para `auth.uid()`.
- `issue_user_warning`, `revoke_user_warning`, `get_reported_message_evidence`: validam `is_moderator()` + pós-lock `for share nowait`.
- `acknowledge_user_warning`, `get_or_create_dm_conversation`, `send_direct_message`, `report_direct_message`, `mark_dm_conversation_read`: validam `auth.uid()` e `not is_suspended`.
- Funções de trigger (`on_topic_vote_changed`, `on_vote_changed`, `notify_mentions`, `on_topic_created_mentions`, `on_post_created`): `EXECUTE` revogado de `public, anon, authenticated`.
