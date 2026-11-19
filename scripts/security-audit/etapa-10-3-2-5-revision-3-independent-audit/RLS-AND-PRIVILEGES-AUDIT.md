# AUDITORIA DE RLS E PRIVILÉGIOS — REVISÃO 3

Todas as garantias de RLS, grants/revokes e `SECURITY DEFINER` (`SET search_path = ''`, validação de `auth.uid()`, checagem de suspensão/papel e `EXECUTE` restrito) da Revisão 2 foram integralmente preservadas na Revisão 3 (`41485` bytes):
- `anon` bloqueado (`42501`) em `topics`, `posts`, `resources`, `categories`, `tags`, `topic_tags` e em todas as 7 novas tabelas/RPCs sociais.
- `reported_message_snapshots` sem privilégios diretos (`UPDATE`/`DELETE` bloqueados com `42501` até para `moderator`), acessível apenas via `get_reported_message_evidence(uuid)` com log em `audit_logs`.
- `direct_messages_select` exige `is_active_member()`, `is_dm_participant(conversation_id)` e `status = 'published'`.
- `mark_dm_conversation_read(uuid)` atualiza exclusivamente `last_read_at` do próprio chamador com `42501` uniforme.
