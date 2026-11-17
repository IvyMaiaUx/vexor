# Etapa 9.1.9 — Remote Schema Validation

- **Data:** 2026-11-13
- **Projeto:** Vexor (`zcjudcbckcxwnfnrjfte`)
- **Métodos utilizados (read-only):**
  - `npx supabase inspect db table-stats --remote` (`exit_code = 0`)
  - `npx supabase inspect db index-stats --remote` (`exit_code = 0`)
  - `npx supabase gen types typescript --linked` (`exit_code = 0`)

## 1. Tabelas no schema `public` (12/12 confirmadas)

Todas as 12 tabelas esperadas foram confirmadas via `inspect db table-stats --remote`, todas com `estimated_row_count: "0"` (sem seed aplicado):

1. `public.audit_logs`
2. `public.bookmarks`
3. `public.categories`
4. `public.notifications`
5. `public.posts`
6. `public.profiles`
7. `public.reports`
8. `public.resources`
9. `public.tags`
10. `public.topic_tags`
11. `public.topics`
12. `public.votes`

## 2. ENUMs no schema `public` (9/9 confirmados via `gen types typescript --linked`)

Confirmados na saída gerada diretamente do schema remoto em `src/types/database.types.ts` (linhas 827-857):

1. `category_scope`: `"resource" | "forum" | "both"`
2. `content_status`: `"published" | "hidden" | "deleted"`
3. `difficulty_level`: `"beginner" | "intermediate" | "advanced"`
4. `notification_type`: `"topic_reply" | "solution_accepted" | "resource_approved" | "resource_rejected"`
5. `report_reason`: `"spam" | "malicious_content" | "personal_data" | "harassment" | "unauthorized_attack" | "copyright" | "other"`
6. `report_status`: `"open" | "reviewing" | "resolved" | "dismissed"`
7. `resource_status`: `"pending" | "approved" | "rejected" | "archived"`
8. `resource_type`: `"tool" | "repository" | "script" | "framework" | "documentation" | "lab" | "ctf_platform" | "course" | "article"`
9. `user_role`: `"member" | "moderator" | "admin"`

## 3. View `public.public_profiles`

Confirmada na seção `Views` de `src/types/database.types.ts` (linhas 726-765) com exatamente as 10 colunas públicas esperadas (`avatar_url`, `bio`, `created_at`, `display_name`, `github_url`, `id`, `interests`, `linkedin_url`, `preferred_locale`, `username`) e sem exposição de `role`, `is_suspended` ou `updated_at`.

## 4. Funções / RPCs no schema `public` (15/15 confirmadas via `gen types typescript --linked`)

Confirmadas na seção `Functions` de `src/types/database.types.ts` (linhas 767-826):
- `admin_set_user_role`
- `admin_set_user_suspension`
- `current_user_role`
- `is_active_member`
- `is_admin`
- `is_moderator`
- `moderate_post`
- `moderate_resource`
- `moderate_topic`
- `normalize_resource_url`
- `resolve_report`
- `resubmit_resource`
- `set_accepted_post`
- `topic_has_replies`
- `write_audit_log`

## 5. Integridade de `audit_logs` (Alternativa C)

Confirmado em `src/types/database.types.ts` (linhas 42-71) que `public.audit_logs.Relationships` é `[]` — ou seja, **`audit_logs_actor_id_fkey` não existe**, preservando a Alternativa C aprovada.

## 6. Índices confirmados via `inspect db index-stats --remote`

Índices críticos observados na saída remota, incluindo:
- `resources_search_idx`, `topics_search_idx`
- `resources_name_trgm`, `topics_title_trgm`
- `resources_url_active_key`
- `audit_logs_actor_idx`
- `profiles_role_idx`

## 7. Limitação técnica de inspeção direta (Triggers e opções internas de View)

Como o ambiente local não dispõe de `psql` conectado diretamente ao banco remoto nem de daemon Docker para `supabase db dump` local, triggers (`pg_trigger`) e opções internas da view (`security_invoker`, `security_barrier` em `pg_class.reloptions`) não foram consultados diretamente via SQL no servidor remoto. A presença deles decorre exclusivamente da execução bem-sucedida (`exit_code = 0`) das migrations auditadas (`20261110000002_functions_triggers.sql` e `20261113143000_security_hardening.sql`) via `supabase db push --remote --yes`.
