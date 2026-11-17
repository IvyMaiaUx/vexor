# Etapa 9.1.9 — Database Types Report

- **Data:** 2026-11-13
- **Arquivo regenerado:** `src/types/database.types.ts` (1617 linhas)
- **Comando de geração:** `cmd /c "npx supabase gen types typescript --linked > src\types\database.types.ts"` (`exit_code = 0`)
- **Verificação TypeScript:** `npx tsc --noEmit` (`exit_code = 0`, sem erros)

## 1. Verificações estruturais no arquivo gerado

1. **View `public_profiles` (linhas 726-765):**
   - Presente em `Database.public.Views.public_profiles`.
   - Expõe apenas os 10 campos públicos esperados: `avatar_url`, `bio`, `created_at`, `display_name`, `github_url`, `id`, `interests`, `linkedin_url`, `preferred_locale`, `username`.
   - Não expõe `role`, `is_suspended` ou `updated_at`.
   - Referenciada pelas relações públicas de tabelas dependentes (`referencedRelation: "public_profiles"`).
2. **Ausência de `audit_logs_actor_id_fkey` (linhas 42-71):**
   - `Database.public.Tables.audit_logs.Relationships` é `[]`.
   - Confirma a preservação da Alternativa C (`actor_id` sem FK para `profiles` ou `auth.users`).
3. **12 tabelas, 9 ENUMs e 15 RPCs/Functions:**
   - Todas as 12 tabelas de `public` presentes.
   - Todos os 9 ENUMs (`category_scope`, `content_status`, `difficulty_level`, `notification_type`, `report_reason`, `report_status`, `resource_status`, `resource_type`, `user_role`) presentes (linhas 827-857).
   - Todas as 15 funções/RPCs (`admin_set_user_role`, `admin_set_user_suspension`, `current_user_role`, `is_active_member`, `is_admin`, `is_moderator`, `moderate_post`, `moderate_resource`, `moderate_topic`, `normalize_resource_url`, `resolve_report`, `resubmit_resource`, `set_accepted_post`, `topic_has_replies`, `write_audit_log`) presentes (linhas 767-826).

## 2. Resultado da compilação TypeScript

- `npx tsc --noEmit` executado após a regeneração de `src/types/database.types.ts` concluiu com `exit_code = 0` e nenhuma saída de erro.
