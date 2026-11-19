# VEXOR — Etapa 10.3: Modelagem de Banco de Dados (Proposta)

## 1. Resumo: Reaproveitar vs. Criar

| Entidade | Ação | Motivo |
| :--- | :--- | :--- |
| `profiles`, `public_profiles` | Reaproveitar | Identidade, roles, suspensão e perfil público |
| `categories`, `tags`, `topic_tags` | Reaproveitar | Taxonomia única para timeline, fórum e catálogo |
| `topics`, `posts`, `votes` | Reaproveitar + estender | Base da timeline (`kind`, `shared_url`, `resource_id`, `vote_count` em `topics`) |
| `topic_votes` | **Nova tabela** | UPs em publicações/tópicos da timeline (`(user_id, topic_id)`) |
| `user_warnings` | **Nova tabela** | Histórico e estado de advertências formais separadas de suspensão |
| `direct_conversations` | **Nova tabela** | Conversas 1:1 com par canônico `(participant_low, participant_high)` |
| `direct_conversation_members` | **Nova tabela** | Pertencimento, `last_read_at`, arquivamento e silenciamento |
| `direct_messages` | **Nova tabela** | Mensagens privadas com soft-delete e paginação por `created_at` |
| `user_blocks` | **Nova tabela** | Bloqueio bilateral/unilateral entre usuários |
| `reported_message_snapshots` | **Nova tabela** | Evidência mínima congelada somente quando uma DM é denunciada |
| `reports` | Reaproveitar + estender | Suportar `message_snapshot_id` mantendo `num_nonnulls(...) = 1` |
| `notifications` | Reaproveitar + estender | Novos `notification_type` + FKs opcionais (`warning_id`, `conversation_id`, `message_id`) |
| `audit_logs` | Reaproveitar | Registrar advertências, ocultações, remoções e acesso a snapshots denunciados |

## 2. ENUMs e Alterações Necessárias
- **Novo ENUM `public.topic_kind`:** `'discussion'`, `'question'`, `'tool_share'`, `'note'`.
- **Novo ENUM `public.warning_severity`:** `'low'`, `'medium'`, `'high'`.
- **Novo ENUM `public.warning_status`:** `'active'`, `'acknowledged'`, `'revoked'`.
- **Extensão de `public.notification_type`:** adicionar `'topic_upvoted'`, `'post_upvoted'`, `'post_reply'`, `'mention'`, `'direct_message'`, `'user_warning'`, `'content_hidden'`, `'content_removed'`.
- **Preservados sem alteração:** `user_role`, `content_status`, `report_status`, `report_reason`, `resource_status`, `research_*`.

## 3. Triggers e RPCs Propostos
- `on_topic_vote_changed()`: atualiza `topics.vote_count` e dispara notificação `topic_upvoted` (anti-duplicação + `author_id <> new.user_id`).
- `on_vote_changed()` (estendida): além de `posts.vote_count`, dispara notificação `post_upvoted` sem auto-notificação e com janela anti-duplicação.
- `moderate_topic` / `moderate_post` (estendidas): ao executar `hide` ou `delete`, notificar o autor (`content_hidden` / `content_removed`) além de gravar `audit_logs`.
- `get_or_create_dm_conversation(p_other_user_id uuid)`: cria ou retorna conversa 1:1 validando `is_active_member()` e ausência de `user_blocks`.
- `send_direct_message(p_conversation_id uuid, p_body text)`: valida pertencimento + ausência de bloqueio + rate limit, insere em `direct_messages`, atualiza `direct_conversations.last_message_at` e cria notificação `direct_message`.
- `mark_dm_conversation_read(p_conversation_id uuid)`: atualiza `last_read_at = now()` do membro autenticado.
- `report_direct_message(p_message_id uuid, p_reason, p_details)`: valida participação, cria snapshot imutável em `reported_message_snapshots` e insere em `reports`.
- `issue_user_warning(...)`, `acknowledge_user_warning(...)`, `revoke_user_warning(...)`.
