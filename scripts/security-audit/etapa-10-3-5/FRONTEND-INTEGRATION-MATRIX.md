# MATRIZ DE INTEGRAÇÃO NEXT.JS — ETAPA 10.3.5

## 1. Matriz de Integração

| Funcionalidade | Banco / RPC | Serviço Frontend | API / Server Action | Interface |
|---|---|---|---|---|
| **Timeline** | `topics` (`kind`, `vote_count`, `topics_timeline_keyset_idx`, `topics_kind_keyset_idx`) | `src/features/forum/forum-service.ts` (cursor `(created_at, id)`) | Route Handler / Server Component com `createClient()` + `getUser()` | Home autenticada + `/forum` |
| **Publicações** | `topics` (`INSERT (category_id, title, body)` + `kind`, `shared_url`, `resource_id`) | `forum-service.ts` + `validation.ts` | `POST /api/topics` ou inserção RLS autenticada | Composer na timeline e `/forum/new` |
| **UPs** | `public.topic_votes` + `votes` (`posts`) | `forum-service.ts` | RLS `authenticated` (`is_active_member()`) | Botão UP em cards e detalhe |
| **Comentários** | `public.posts` + `on_post_created()` | `forum-service.ts` | RLS `authenticated` | Thread em `/forum/[id]` e expansão rápida |
| **Denúncias** | `public.reports` + `report_direct_message(uuid, report_reason, text)` | `src/features/reports/report-service.ts` | `POST /api/reports/dm` (mapeia `23505` → `409`) | `report-modal.tsx` + denúncia em DM |
| **Bloqueios** | `public.user_blocks` | `block-service.ts` (novo) | RLS `authenticated` (`blocker_id = auth.uid()`) | Menu do perfil e cabeçalho da DM |
| **Mensagens privadas** | `direct_conversations`, `direct_messages`, `get_or_create_dm_conversation`, `send_direct_message`, `mark_dm_conversation_read` | `dm-service.ts` (novo) | `GET/POST /api/dm/*` + Realtime | Nova rota `/messages` + badge no `header.tsx` |
| **Advertências** | `public.user_warnings`, `issue_user_warning`, `acknowledge_user_warning`, `revoke_user_warning`, `get_reported_message_evidence` | `warning-service.ts` (novo) + `supabase-admin-provider.ts` | `POST /api/admin/warnings/*` + `GET /api/admin/reports/[id]/evidence` | `/admin/moderation`, `/admin/reports`, `/profile` |
| **Notificações** | `public.notifications` (novos tipos + `conversation_id`, `message_id`, `warning_id`) | `src/features/notifications/notification-service.ts` | RLS `authenticated` + Realtime | `notification-bell.tsx` |

## 2. Tradução Obrigatória de SQLSTATEs → HTTP
- `23505` → **HTTP `409 Conflict`** (denúncia/voto/advertência duplicada; sem vazar detalhes internos)
- `55P03` → **HTTP `409 Conflict`** (`lock_conflict`, orientar retry)
- `40P01` → **HTTP `409 Conflict` / `503`** (retry controlado)
- `42501` → **HTTP `403 Forbidden`** (suspenso, bloqueado, papel insuficiente ou não participante)
- `P0002` → **HTTP `404 Not Found`** (recurso/conversa/DM inexistente ou oculta/removida)
- `42901` → **HTTP `429 Too Many Requests`** (rate limit `30 DMs/min`)

## 3. Segurança SSR
Manter estritamente `src/lib/supabase/server.ts` (`getUser()`) e `src/proxy.ts`, sem `service_role` e sem autenticação paralela. Atualizar `src/types/database.types.ts` na próxima etapa de implementação.
