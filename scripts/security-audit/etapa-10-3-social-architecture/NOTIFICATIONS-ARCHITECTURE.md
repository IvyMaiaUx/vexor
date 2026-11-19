# VEXOR — Etapa 10.3: Arquitetura da Central de Notificações

## 1. Diagnóstico do Sistema Atual
- A tabela `public.notifications` já existe com `user_id`, `type`, `actor_id`, `topic_id`, `post_id`, `resource_id`, `read_at`, `created_at` e índices `notifications_user_idx` e `notifications_unread_idx`.
- O serviço `src/features/notifications/notification-service.ts` e o componente `NotificationBell` já implementam listagem paginada, contador de não lidas, `markAsRead`, `markAllAsRead` e roteamento interno seguro (`buildNotificationTargetHref`).

## 2. Novos Eventos e Extensão de `notification_type`
Preservar todos os valores atuais (`topic_reply`, `solution_accepted`, `resource_approved`, `resource_rejected`, `research_approved`, `research_rejected`) e adicionar ao ENUM `public.notification_type`:
- `topic_upvoted` — UP recebido na publicação/tópico.
- `post_upvoted` — UP recebido em comentário/resposta.
- `post_reply` — Resposta direta a comentário (quando houver `parent_post_id` ou menção no tópico).
- `mention` — Menção `@username` em publicação ou comentário.
- `direct_message` — Nova mensagem privada recebida.
- `user_warning` — Advertência formal recebida da moderação.
- `content_hidden` — Publicação/comentário ocultado pela moderação.
- `content_removed` — Publicação/comentário removido pela moderação.

## 3. Ajustes Estruturais na Tabela `notifications`
- Adicionar colunas opcionais com FK e `ON DELETE CASCADE`:
  - `conversation_id uuid references public.direct_conversations(id) on delete cascade`
  - `message_id uuid references public.direct_messages(id) on delete cascade`
  - `warning_id uuid references public.user_warnings(id) on delete cascade`
  - `metadata jsonb not null default '{}'::jsonb` (ex.: motivo resumido da ocultação/advertência sem expor dados sensíveis).

## 4. Regras de Integridade e Anti-Ruído
1. **Nunca notificar o próprio autor:** todas as triggers/RPCs mantêm `target_user_id is distinct from actor_id`.
2. **Anti-duplicação:**
   - Para UPs (`topic_upvoted`, `post_upvoted`): se o usuário der UP, tirar e der UP de novo, verificar existência recente (ex.: mesma dupla `(user_id, actor_id, type, topic_id/post_id)` dentro de janela de 24h ou índice único parcial enquanto não lida) para evitar flood de notificações.
   - Para DMs (`direct_message`): aglutinar ou suprimir se já houver notificação não lida da mesma `conversation_id` nas últimas horas (ou atualizar `created_at` da notificação não lida).
3. **Navegação segura:** `buildNotificationTargetHref` passa a mapear `/messages?conversation=<id>`, `/profile#warnings` (ou modal de advertência), e `/forum/<topic_id>#post-<post_id>` sempre validando UUIDs/slugs.
4. **Tempo real:** Canal Realtime em `notifications` filtrado por `user_id=eq.<auth.uid()>` atualiza o badge no `Header` imediatamente.
