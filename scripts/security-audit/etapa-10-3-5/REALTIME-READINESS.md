# PRONTIDÃO PARA REALTIME — ETAPA 10.3.5

## 1. Estado Atual Classificado
- **Configuração confirmada:**
  - Role `supabase_realtime_admin` presente no remoto (`search_path=public, extensions, realtime`, `inspect db role-stats --remote`).
  - Policies `SELECT` compatíveis com Realtime Postgres Changes: `direct_messages_select` (`is_active_member() AND is_dm_participant(conversation_id) AND status = 'published'`) e `notifications` (`user_id = auth.uid()`).
- **Configuração ausente (intencionalmente pendente para Fase B):**
  - `20261117234500_social_community.sql` **não adicionou** `public.direct_messages` nem `public.notifications` à publicação `supabase_realtime` (nem alterou `REPLICA IDENTITY`).
- **Configuração não verificável sem escrita/WebSocket:**
  - Entrega efetiva de eventos WebSocket filtrados por RLS entre duas sessões autenticadas.

## 2. Recomendações para a Fase B
1. Habilitar `ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages, public.notifications;` em migration incremental na Fase B (ou via painel Realtime) antes de ligar assinaturas no frontend.
2. Nunca assinar `reported_message_snapshots` ou `audit_logs` no Realtime.
3. Validar em teste WebSocket real que participante não-membro nunca recebe payload de `direct_messages`.
