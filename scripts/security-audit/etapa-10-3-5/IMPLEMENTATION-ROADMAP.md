# ROADMAP DE IMPLEMENTAÇÃO SOCIAL (FASE B) — ETAPA 10.3.5

1. **Etapa 10.3.6 — Base de Tipos e Pequena Migration Complementar (se autorizada):**
   - Regenerar `src/types/database.types.ts`.
   - Avaliar migration incremental pequena para `GRANT INSERT (kind, shared_url, resource_id) ON public.topics TO authenticated` (ou RPC) e `ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages, public.notifications;`.
2. **Etapa 10.3.7 — Timeline, Publicações Imediatas e UPs:**
   - Estender `forum-service.ts` (cursor `(created_at, id)`, `topic_votes`, `kind`, `shared_url`) e atualizar Home autenticada + `/forum`.
3. **Etapa 10.3.8 — Bloqueios, Mensagens Privadas e Realtime:**
   - Criar `block-service.ts`, `dm-service.ts`, rotas `/api/dm/*` (traduzindo SQLSTATEs `23505`, `55P03`, `40P01`, `42501`, `P0002`, `42901`), UI `/messages` e testes WebSocket com 2 sessões.
4. **Etapa 10.3.9 — Advertências, Notificações Sociais e Painel Admin:**
   - Atualizar `notification-service.ts`, `report-service.ts`, `supabase-admin-provider.ts` e UI de advertências/evidências DM.
