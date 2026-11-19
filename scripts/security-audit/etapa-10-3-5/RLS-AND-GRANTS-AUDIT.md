# AUDITORIA DE RLS E GRANTS — ETAPA 10.3.5

## 1. Matriz de Permissões Efetivada por `20261117234500_social_community.sql`

| Tabela | RLS | `anon` | `authenticated` | Policies Aplicadas |
|---|---|---|---|---|
| `public.topic_votes` | Habilitada | Revogado (`REVOKE ALL`) | `SELECT`, `DELETE`, `INSERT (topic_id)` | `topic_votes_select_own`, `topic_votes_insert` (`is_active_member()`, tópico `published`), `topic_votes_delete_own` (`is_active_member()`) |
| `public.user_blocks` | Habilitada | Revogado | `SELECT`, `DELETE`, `INSERT (blocked_id)` | `user_blocks_select_own`, `user_blocks_insert_own` (`is_active_member()`, `<> auth.uid()`), `user_blocks_delete_own` (`is_active_member()`) |
| `public.user_warnings` | Habilitada | Revogado | `SELECT` apenas | `user_warnings_select` (`user_id = auth.uid()` ou `is_moderator()`) |
| `public.direct_conversations` | Habilitada | Revogado | `SELECT` apenas | `direct_conversations_select` (`is_dm_participant(id)`) |
| `public.direct_conversation_members` | Habilitada | Revogado | `SELECT` apenas | `direct_conv_members_select` (`is_dm_participant(conversation_id)`) |
| `public.direct_messages` | Habilitada | Revogado | `SELECT` apenas | `direct_messages_select` (`is_active_member() AND is_dm_participant(conversation_id) AND status = 'published'`) |
| `public.reported_message_snapshots` | Habilitada | Revogado | Nenhum privilégio direto (`REVOKE ALL`) | Sem policies diretas; leitura exclusiva via `get_reported_message_evidence(uuid)` |

## 2. Revogação de `anon` em Tabelas de Conteúdo
- `REVOKE SELECT ON public.topics, public.posts, public.resources, public.categories, public.tags, public.topic_tags FROM anon;`
- `topics_select`, `posts_select` e `resources_select` recriadas com `TO authenticated`.
- **Timeout de roles observado em produção (`inspect db role-stats --remote`):** `anon` (`statement_timeout=3s`), `authenticated` (`statement_timeout=8s`), `authenticator` (`statement_timeout=8s, lock_timeout=8s`).
