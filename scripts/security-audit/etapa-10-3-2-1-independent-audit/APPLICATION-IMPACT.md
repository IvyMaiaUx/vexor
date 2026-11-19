# ANÁLISE DE IMPACTO NA APLICAÇÃO (FASE B)

> Nenhum arquivo em `src/` foi modificado nesta etapa. Lista de impacto para planejamento da Fase B.

## 1. Arquivos Existentes Impactados
| Arquivo / Área | Impacto Previsto |
|---|---|
| [database.types.ts](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/src/types/database.types.ts) | Regenerar/estender tipos: novos enums (`topic_kind`, `warning_severity`, `warning_status`), novos valores de `notification_type`, novas colunas em `topics` (`kind`, `shared_url`, `resource_id`, `vote_count`), `reports` (`message_snapshot_id`), `notifications` (`conversation_id`, `message_id`, `warning_id`, `metadata`), novas tabelas (`topic_votes`, `user_blocks`, `user_warnings`, `direct_conversations`, `direct_conversation_members`, `direct_messages`, `reported_message_snapshots`) e novas RPCs. |
| [forum-service.ts](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/src/features/forum/forum-service.ts) | Suporte a `kind`, `shared_url`, `resource_id`, `vote_count`, paginação por cursor composto `(created_at, id)` e toggle em `topic_votes`. |
| [notification-service.ts](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/src/features/notifications/notification-service.ts) | Mapear novos tipos (`topic_upvoted`, `post_upvoted`, `post_reply`, `mention`, `direct_message`, `user_warning`, `content_hidden`, `content_removed`) e deep links seguros (`conversation_id`, `warning_id`). |
| [report-service.ts](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/src/features/reports/report-service.ts) | Suporte a denúncia de DM via RPC `report_direct_message(p_message_id, p_reason, p_details)`. |
| [admin-server-handlers.ts](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/src/features/admin/server/admin-server-handlers.ts) & [supabase-admin-provider.ts](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/src/features/admin/data/supabase-admin-provider.ts) | Novos endpoints/ações para emitir/revogar advertências (`issue_user_warning`, `revoke_user_warning`) e visualizar evidência de DM denunciada exclusivamente via `get_reported_message_evidence(p_report_id)`. |
| [header.tsx](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/src/components/layout/header.tsx) & navegação | Links para Timeline (Home autenticada), Mensagens Privadas (badge de não lidas), Notificações, Advertências no Perfil e preservação do CTA de envio de recursos em `/catalog` tanto no desktop quanto no drawer mobile (`AUD-11`). |

## 2. Novos Módulos / APIs Necessários na Fase B
- **Serviços e rotas:** `dm-service.ts`, `warning-service.ts`, `block-service.ts`, Route Handlers server-side com `getUser()` + verificação de `is_suspended` + rate limit de aplicação.
- **Realtime:** Assinatura controlada por sessão autenticada em `direct_messages` (filtrada por conversa) e `notifications` (filtrada por `user_id`), sem uso de `service_role`.
- **Paginação:** Cursor composto `(created_at, id)` validado server-side (ISO timestamp + UUID) tanto na timeline quanto no histórico de DMs.
