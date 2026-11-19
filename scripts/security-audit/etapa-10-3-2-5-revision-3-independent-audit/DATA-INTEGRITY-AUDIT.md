# AUDITORIA DE INTEGRIDADE DE DADOS — REVISÃO 3

- Foreign keys e ações `ON DELETE` da Revisão 2 permanecem inalteradas na Revisão 3:
  - `reported_message_snapshots` não possui FK `ON DELETE CASCADE` para `direct_messages` nem para `direct_conversations`, e usa `ON DELETE SET NULL` para `sender_id`/`captured_by`.
  - `reports.message_id` + `reports_dm_message_id_pair` + `reports_dedupe_direct_message_active` garantem consistência entre snapshot e denúncia ativa.
  - `user_warnings` preserva `moderator_id`/`revoked_by` via `ON DELETE SET NULL`.
  - `topics.vote_count` e `posts.vote_count` possuem constraints `>= 0` e triggers atômicos.
