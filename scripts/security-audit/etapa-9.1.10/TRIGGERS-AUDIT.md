# Etapa 9.1.10 — Triggers Audit (Fase G)

- **Data:** 2026-11-13
- **Método:** Consulta read-only em `pg_trigger` + `pg_proc` no banco remoto.
- **Status:** `VERIFIED_REMOTE` (todos os triggers com `enabled_state = 'O'` — habilitados)

## 1. Triggers do domínio Vexor confirmados no remoto

| Schema / Tabela | Trigger | Timing / Evento | Função | Estado |
|---|---|---|---|---|
| `auth.users` | `on_auth_user_created` | `AFTER INSERT` (ROW) | `handle_new_user()` | `O` (Habilitado) |
| `public.audit_logs` | `audit_logs_no_truncate` | `BEFORE TRUNCATE` (STATEMENT) | `audit_logs_block_mutation()` | `O` (Habilitado) |
| `public.audit_logs` | `audit_logs_no_update_delete` | `BEFORE UPDATE OR DELETE` (ROW) | `audit_logs_block_mutation()` | `O` (Habilitado) |
| `public.profiles` | `profiles_protect_last_admin_delete` | `BEFORE DELETE` (ROW) | `protect_last_admin_delete()` | `O` (Habilitado) |
| `public.profiles` | `profiles_set_updated_at` | `BEFORE UPDATE` (ROW) | `set_updated_at()` | `O` (Habilitado) |
| `public.categories` | `categories_after_change` | `AFTER INSERT OR UPDATE OR DELETE` (ROW) | `on_category_changed()` | `O` (Habilitado) |
| `public.categories` | `categories_set_updated_at` | `BEFORE UPDATE` (ROW) | `set_updated_at()` | `O` (Habilitado) |
| `public.posts` | `posts_after_insert` | `AFTER INSERT` (ROW) | `on_post_created()` | `O` (Habilitado) |
| `public.posts` | `posts_set_updated_at` | `BEFORE UPDATE` (ROW) | `set_updated_at()` | `O` (Habilitado) |
| `public.resources` | `resources_before_insert_slug` | `BEFORE INSERT` (ROW) | `resources_set_slug()` | `O` (Habilitado) |
| `public.resources` | `resources_set_updated_at` | `BEFORE UPDATE` (ROW) | `set_updated_at()` | `O` (Habilitado) |
| `public.topic_tags` | `topic_tags_before_insert` | `BEFORE INSERT` (ROW) | `topic_tags_limit()` | `O` (Habilitado) |
| `public.topics` | `topics_set_updated_at` | `BEFORE UPDATE` (ROW) | `set_updated_at()` | `O` (Habilitado) |
| `public.votes` | `votes_after_change` | `AFTER INSERT OR DELETE` (ROW) | `on_vote_changed()` | `O` (Habilitado) |

Nenhum trigger foi disparado por escrita durante esta auditoria (`NOT_VERIFIED_WITHOUT_WRITE_TEST` no remoto; comportamento funcional validado previamente na Etapa 9.1.6/9.1.6.1).
