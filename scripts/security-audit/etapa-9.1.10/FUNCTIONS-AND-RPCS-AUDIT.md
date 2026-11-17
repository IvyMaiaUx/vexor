# Etapa 9.1.10 — Functions and RPCs Audit (Fase F)

- **Data:** 2026-11-13
- **Método:** Consulta read-only em `pg_proc` e `has_function_privilege` no banco remoto.
- **Status:** `VERIFIED_REMOTE`

## 1. Inventário das 15 funções/RPCs expostas do domínio

Todas possuem `owner = postgres` e `search_path = ""` (`config: ["search_path=\"\""]`):

| Função | `SECURITY DEFINER` | `PUBLIC` | `anon` | `authenticated` | `service_role` | Checagem interna |
|---|---|---|---|---|---|---|
| `admin_set_user_role(uuid, user_role)` | `true` | `false` | `false` | `true` | `true` | `auth.uid()` + `is_admin()` + último admin |
| `admin_set_user_suspension(uuid, boolean, text)` | `true` | `false` | `false` | `true` | `true` | `auth.uid()` + `is_admin()` + último admin |
| `moderate_resource(uuid, resource_status, text)` | `true` | `false` | `false` | `true` | `true` | `auth.uid()` + `is_moderator()` |
| `moderate_topic(uuid, text, text)` | `true` | `false` | `false` | `true` | `true` | `auth.uid()` + `is_moderator()` |
| `moderate_post(uuid, text, text)` | `true` | `false` | `false` | `true` | `true` | `auth.uid()` + `is_moderator()` |
| `resolve_report(uuid, report_status, text)` | `true` | `false` | `false` | `true` | `true` | `auth.uid()` + `is_moderator()` |
| `resubmit_resource(uuid)` | `true` | `false` | `false` | `true` | `true` | `auth.uid()` + `is_active_member()` + dono |
| `set_accepted_post(uuid, uuid)` | `true` | `false` | `false` | `true` | `true` | `auth.uid()` + `is_active_member()` + autor/mod |
| `write_audit_log(text, text, uuid, jsonb)` | `true` | `false` | `false` | `false` | `true` | Uso interno (`service_role` / `SECURITY DEFINER`) |
| `current_user_role()` | `true` | `true` | `true` | `true` | `true` | `auth.uid()` (read-only helper) |
| `is_active_member()` | `true` | `true` | `true` | `true` | `true` | `auth.uid()` (read-only helper) |
| `is_admin()` | `true` | `true` | `true` | `true` | `true` | Delega para `current_user_role()` |
| `is_moderator()` | `true` | `true` | `true` | `true` | `true` | Delega para `current_user_role()` |
| `topic_has_replies(uuid)` | `true` | `true` | `true` | `true` | `true` | Read-only helper para RLS |
| `normalize_resource_url(text)` | `false` (`INVOKER`) | `true` | `true` | `true` | `true` | Função pura de normalização |

## 2. Funções adicionais em `public`

- **Funções de trigger (9):** `audit_logs_block_mutation` (`INVOKER`), `handle_new_user` (`DEFINER`), `on_category_changed` (`DEFINER`), `on_post_created` (`DEFINER`), `on_vote_changed` (`DEFINER`), `protect_last_admin_delete` (`DEFINER`), `resources_set_slug` (`INVOKER`), `set_updated_at` (`INVOKER`), `topic_tags_limit` (`INVOKER`). Todas têm `search_path = ""` e `EXECUTE` revogado de `PUBLIC`, `anon` e `authenticated`.
- **Função gerenciada pelo Supabase:** `rls_auto_enable()` (`return_type = event_trigger`, `search_path = pg_catalog`). Por retornar `event_trigger`, não é invocável via PostgREST (`/rest/v1/rpc`), embora apareça nos advisors padrão do Supabase.
