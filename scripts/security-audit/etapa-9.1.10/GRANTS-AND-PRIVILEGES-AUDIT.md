# Etapa 9.1.10 — GRANTs and Privileges Audit (Fase D)

- **Data:** 2026-11-13
- **Método:** Consulta read-only em `pg_class.relacl`, `pg_attribute.attacl`, `has_table_privilege` e `has_schema_privilege`.
- **Status:** `VERIFIED_REMOTE`

## 1. Privilégios no schema `public`

- `anon`: `USAGE = true`, `CREATE = false`
- `authenticated`: `USAGE = true`, `CREATE = false`
- `service_role`: `USAGE = true`, `CREATE = false`
- `postgres`: `USAGE = true`, `CREATE = true`

## 2. Privilégios por tabela e view (`pg_class.relacl` e `pg_attribute.attacl`)

| Objeto | `anon` | `authenticated` | `service_role` |
|---|---|---|---|
| `audit_logs` | Nenhum | `SELECT` apenas | Completo (`arwdDxtm`) |
| `profiles` | Nenhum | `SELECT` (via RLS) + `UPDATE` restrito às 8 colunas públicas (`username`, `display_name`, `avatar_url`, `bio`, `interests`, `github_url`, `linkedin_url`, `preferred_locale`) | Completo |
| `public_profiles` (view) | `SELECT` | `SELECT` | Completo |
| `bookmarks` | Nenhum | `SELECT`, `DELETE`, `INSERT (resource_id)` | Completo |
| `notifications` | Nenhum | `SELECT`, `DELETE`, `UPDATE (read_at)` | Completo |
| `reports` | Nenhum | `SELECT`, `INSERT (topic_id, post_id, resource_id, profile_id, reason, details)` | Completo |
| `votes` | Nenhum | `SELECT`, `DELETE`, `INSERT (post_id)` | Completo |
| `posts` | `SELECT` | `SELECT`, `DELETE`, `INSERT (topic_id, body)`, `UPDATE (body)` | Completo |
| `topics` | `SELECT` | `SELECT`, `DELETE`, `INSERT/UPDATE (category_id, title, body)` | Completo |
| `resources` | `SELECT` | `SELECT`, `DELETE`, `INSERT/UPDATE (name, description, category_id, type, url, language, difficulty, author_name)` | Completo |
| `tags` | `SELECT` | `SELECT`, `DELETE`, `INSERT (slug, name)`, `UPDATE (name)` | Completo |
| `topic_tags` | `SELECT` | `SELECT`, `DELETE`, `INSERT (topic_id, tag_id)` | Completo |
| `categories` | `SELECT` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` (limitado por RLS a `is_admin()`) | Completo |

## 3. Conclusões da Fase D

1. `anon` **não** possui acesso à tabela `public.profiles` (apenas à view `public_profiles`).
2. `authenticated` **não** possui `UPDATE` em `profiles.role`, `profiles.is_suspended`, `topics.is_locked`, `topics.is_pinned`, `topics.accepted_post_id`, `resources.status` ou `posts.status`.
3. `authenticated` e `anon` **não** possuem `INSERT`, `UPDATE` ou `DELETE` em `audit_logs`.
4. Todas as RPCs administrativas e de moderação tiveram `EXECUTE` revogado de `PUBLIC` e `anon`.
