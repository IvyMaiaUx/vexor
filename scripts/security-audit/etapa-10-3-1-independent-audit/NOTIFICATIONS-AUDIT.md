# VEXOR — Etapa 10.3.1: Auditoria da Central de Notificações

## 1. Eventos Propostos e Compatibilidade
- A extensão de `public.notification_type` preserva os 6 tipos atuais (`topic_reply`, `solution_accepted`, `resource_approved`, `resource_rejected`, `research_approved`, `research_rejected`) e adiciona os 8 eventos sociais/moderação (`topic_upvoted`, `post_upvoted`, `post_reply`, `mention`, `direct_message`, `user_warning`, `content_hidden`, `content_removed`).

## 2. Achados Críticos/Altos de Concorrência e Schema
- **[HIGH] Deduplicação via índice único sem `ON CONFLICT` quebraria UPs:**
  - `NOTIFICATIONS-ARCHITECTURE.md` sugeriu "índice único parcial enquanto não lida" para evitar flood de UPs. Se a trigger `on_vote_changed` / `on_topic_vote_changed` fizer `INSERT` simples sem `ON CONFLICT DO NOTHING` (ou `WHERE NOT EXISTS`), o segundo UP após un-UP **falharia com erro `23505` e faria rollback do voto**!
  - **Correção:** usar `INSERT ... SELECT ... WHERE NOT EXISTS (SELECT 1 FROM public.notifications n WHERE n.user_id = ... AND n.actor_id = ... AND n.type = ... AND n.created_at > now() - interval '24 hours')` (ou `ON CONFLICT DO NOTHING` com índice único dedicado apenas a notificações não lidas).
- **[MEDIUM] Integridade de referência quando DM é apagada ou ocultada:**
  - Para `direct_message`, `notifications.conversation_id` já permite navegar para `/messages?conversation=<id>` sem depender do `message_id` se a mensagem for soft-deleted.
- **[MEDIUM] Menções (`@username`) sem validação de limite:**
  - Se um tópico citar 50 `@usernames`, um `INSERT` sem limite geraria 50 notificações por spam. **Correção:** limitar extração de menções a no máximo 5–10 usuários distintos por publicação/comentário, ignorando usuários bloqueados (`user_blocks`) e o próprio autor (`actor_id <> user_id`).
- **Segurança de acesso e navegação:** Manter `notifications_select_own`, `notifications_update_own` (`GRANT UPDATE (read_at)`) e `notifications_delete_own` exclusivas para `user_id = auth.uid()`. `buildNotificationTargetHref` deve validar UUIDs e restringir paths internos (`/`, `/forum/`, `/catalog/`, `/messages?conversation=`, `/profile#warnings`).
