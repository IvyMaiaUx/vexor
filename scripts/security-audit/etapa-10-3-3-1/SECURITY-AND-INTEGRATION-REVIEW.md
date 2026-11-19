# REVISÃO DE SEGURANÇA E INTEGRAÇÃO COM O CÓDIGO ATUAL — ETAPA 10.3.3.1

## 1. Revalidação de Segurança (Estática + Histórico de Auditorias)
Todas as garantias aprovadas até a Etapa 10.3.2.5 permanecem íntegras na Revisão 3:
- Anti-recursão DM (`is_dm_participant`), bloqueio de `anon`, bloqueio de usuário suspenso (`42501`), bloqueio bilateral (`user_blocks`), hierarquia `admin > moderator > member` com revalidação pós-lock, imutabilidade de `reported_message_snapshots`, deduplicação ativa `reports_dedupe_direct_message_active` (`23505`), filtro `dm.status = 'published'`, rate limit `30/min` (`42901`), paginação keyset `(created_at, id)` e eliminação do deadlock `40P01` (`FOR NO KEY UPDATE`).

## 2. Compatibilidade com o Código Atual (`src/`)
| Área | Situação Atual vs Revisão 3 | Ação Necessária na Fase B |
|---|---|---|
| `src/types/database.types.ts` | Desatualizado em relação à Revisão 3 (não possui `topic_votes`, `user_warnings`, `user_blocks`, `direct_*`, `reported_message_snapshots`, novos `notification_type`). | Regenerar tipos após promoção da migration. |
| `src/features/forum/forum-service.ts` | Compatível com `topics`/`posts` atuais (`kind` tem default `'discussion'`, `vote_count` default `0`). | Estender para `kind`, `shared_url`, `topic_votes` e cursor `(created_at, id)`. |
| `src/features/notifications/notification-service.ts` | Mapeia tipos atuais; novos tipos (`topic_upvoted`, `post_upvoted`, `mention`, `direct_message`, `user_warning`, etc.) ainda não tratados. | Adicionar mapeamento e deep links seguros. |
| `src/features/reports/report-service.ts` | Não trata `report_direct_message` nem SQLSTATE `23505` específico de DM. | Mapear `23505` → HTTP `409 Conflict`, `P0002` → `404`, `42501` → `403`. |
| `src/features/admin/server/admin-server-handlers.ts` & `supabase-admin-provider.ts` | Compatíveis com RPCs atuais (`moderate_topic`, `moderate_post`, `resolve_report`). | Integrar `issue_user_warning`, `revoke_user_warning`, `get_reported_message_evidence`. |
| `src/proxy.ts` & SSR auth | Compatível (`getUser()` server-side). | Manter validação `getUser()` + `is_suspended` nas novas rotas/APIs. |
