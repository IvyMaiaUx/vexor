# AUDITORIA DO SCHEMA SOCIAL REMOTO — ETAPA 10.3.5

## 1. Projeto e Migration Aplicada
- **Projeto:** `Vexor` (`zcjudcbckcxwnfnrjfte`, `production`, PostgreSQL `17.11`).
- **Migration aplicada:** `20261117234500_social_community.sql` (SHA-256 `1E20A3451482472A4B1993F68C39C07378F61BF71CE67553D99923EB22BA6029`).
- **Evidência remota (`npx supabase inspect db table-stats --linked`, `npx supabase inspect db index-stats --remote`):** Todas as 7 novas tabelas e seus índices primários/secundários/parciais constam criados no catálogo remoto, sem alterações inesperadas nas tabelas históricas.

## 2. Inventário das 7 Tabelas Sociais (Conforme DDL Aplicado + Inspeção Remota)

| Tabela | PK | FKs & `ON DELETE` | Constraints / Índices Confirmados |
|---|---|---|---|
| `public.topic_votes` | `(user_id, topic_id)` | `user_id -> profiles(id) CASCADE`; `topic_id -> topics(id) CASCADE` | `topic_votes_pkey`, `topic_votes_topic_idx` |
| `public.user_blocks` | `(blocker_id, blocked_id)` | `blocker_id/blocked_id -> profiles(id) CASCADE` | `user_blocks_not_self` (`blocker_id <> blocked_id`), `user_blocks_pkey`, `user_blocks_blocked_idx` |
| `public.user_warnings` | `id` (`gen_random_uuid()`) | `user_id -> profiles(id) CASCADE`; `moderator_id/revoked_by -> profiles(id) SET NULL`; `topic_id/post_id/report_id -> SET NULL` | `user_warnings_desc_len` (`10..1500`), `user_warnings_revoke_reason`, `user_warnings_user_idx`, `user_warnings_report_active_key` |
| `public.direct_conversations` | `id` (`gen_random_uuid()`) | `participant_low/high -> profiles(id) CASCADE` | `direct_conversations_pair_order` (`low < high`), `direct_conversations_pair_unique`, `direct_conversations_last_msg_idx` |
| `public.direct_conversation_members` | `(conversation_id, user_id)` | `conversation_id -> direct_conversations(id) CASCADE`; `user_id -> profiles(id) CASCADE` | `direct_conv_members_user_idx` |
| `public.direct_messages` | `id` (`gen_random_uuid()`) | `conversation_id -> direct_conversations(id) CASCADE`; `sender_id -> profiles(id) SET NULL` | `direct_messages_body_len` (`1..4000`), `direct_messages_conv_keyset_idx`, `direct_messages_sender_recent_idx` |
| `public.reported_message_snapshots` | `id` (`gen_random_uuid()`) | `sender_id/captured_by -> profiles(id) SET NULL` (sem FK para `direct_messages` ou `direct_conversations`) | `reported_msg_snapshots_msg_idx` |

- **Extensões em tabelas existentes:** `topics` (`kind`, `shared_url`, `resource_id`, `vote_count`, `topics_shared_url_scheme`, `topics_votes_nonneg`, `topics_timeline_keyset_idx`, `topics_kind_keyset_idx`), `reports` (`message_snapshot_id`, `message_id`, `reports_dm_message_id_pair`, `reports_dedupe_direct_message_active`, `reports_one_target`), `notifications` (`conversation_id`, `message_id`, `warning_id`, `metadata`).
