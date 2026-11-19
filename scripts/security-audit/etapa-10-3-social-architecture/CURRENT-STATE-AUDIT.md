# VEXOR — Etapa 10.3: Auditoria e Diagnóstico do Sistema Atual

## 1. Migrations Oficiais e Schema Conhecido
As 5 migrations oficiais em `supabase/migrations/` (todas aplicadas e sincronizadas no projeto remoto `Vexor` / `zcjudcbckcxwnfnrjfte`) definem a base atual:

1. `20261110000001_schema.sql`:
   - **ENUMs:** `user_role` (`member`, `moderator`, `admin`), `category_scope` (`resource`, `forum`, `both`, estendido com `research`), `resource_type`, `difficulty_level`, `resource_status` (`pending`, `approved`, `rejected`, `archived`), `content_status` (`published`, `hidden`, `deleted`), `report_status` (`open`, `reviewing`, `resolved`, `dismissed`), `report_reason` (`spam`, `malicious_content`, `personal_data`, `harassment`, `unauthorized_attack`, `copyright`, `other`), `notification_type` (`topic_reply`, `solution_accepted`, `resource_approved`, `resource_rejected`, estendido com `research_approved`, `research_rejected`).
   - **Tabelas:** `profiles`, `categories`, `resources`, `topics`, `posts`, `tags`, `topic_tags`, `votes` (apenas `post_id`), `bookmarks`, `reports`, `notifications`, `audit_logs`.
2. `20261110000002_functions_triggers.sql`:
   - Helpers de autorização: `current_user_role()`, `is_active_member()`, `is_moderator()`, `is_admin()`.
   - Triggers: `handle_new_user()`, `on_post_created()` (atualiza `topics.last_activity_at` e insere notificação `topic_reply`), `on_vote_changed()` (atualiza `posts.vote_count`), `topic_tags_limit()`, `audit_logs_block_mutation()`.
   - RPCs: `admin_set_user_role`, `admin_set_user_suspension`, `moderate_resource`, `resubmit_resource`, `moderate_topic`, `moderate_post`, `resolve_report`, `set_accepted_post`.
3. `20261110000003_rls_and_grants.sql` e `20261113143000_security_hardening.sql`:
   - RLS habilitado em todas as tabelas; `public_profiles` view segura sem e-mail; `notifications` e `audit_logs` gravados apenas por `SECURITY DEFINER`.
4. `20261116114600_research_submissions.sql`:
   - `research_submissions`, `research_recipients`, `moderate_research`, `resubmit_research`, `grant_research_recipient`, `revoke_research_recipient`.

## 2. Diagnóstico dos Serviços, APIs e UI Atuais
- **`notification-service.ts`:** Já implementa paginação, `unreadCount`, `markAsRead`, `markAllAsRead`, proteção contra alteração de campos proibidos e roteamento interno seguro (`buildNotificationTargetHref`). Gap: só cobre eventos de fórum/catálogo/research, sem eventos sociais (UP em publicação/comentário, menção, DM, advertência, ocultação/remoção) e sem Realtime.
- **`report-service.ts`:** Suporta denúncias contra `topic`, `post`, `resource`, `profile` e `research`, com deduplicação por denunciante + alvo ativo (`open`/`reviewing`). Gap: não suporta alvo de mensagem privada (`message_id`) com snapshot restrito.
- **`forum-service.ts`:** Já consulta `topics`, `posts`, `tags`, `votes` e `categories` com `content_status = 'published'` por padrão (publicação imediata já existe em `topics` e `posts`, ao contrário de `resources` que nasce `pending`).
- **`research-service.ts` e `SupabaseAdminProvider`:** Painel administrativo (`/admin`, `/admin/moderation`, `/admin/reports`, `/admin/users`, `/admin/audit`, `/admin/research`, `/admin/catalog`, `/admin/forum`) já opera sobre `/api/admin/*` com `requireServerAuthorization("moderator" | "admin")` e `audit_logs`.
- **Navegação e Controle de Acesso (Etapa 10.2):** `src/proxy.ts` e `src/lib/supabase/auth.ts` protegem todas as áreas internas (`/catalog/*`, `/forum/*`, `/my-contributions`, `/profile/*`, `/cybercrime-research/*`, `/admin/*`), mantendo `/` pública apenas com apresentação institucional para visitantes.
