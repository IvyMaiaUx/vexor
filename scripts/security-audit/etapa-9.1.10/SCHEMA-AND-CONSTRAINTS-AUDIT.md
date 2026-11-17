# Etapa 9.1.10 — Schema and Constraints Audit (Fase B)

- **Data:** 2026-11-13
- **Método:** Consulta read-only aos catálogos remotos (`information_schema.tables`, `information_schema.columns`, `pg_constraint`, `pg_indexes`, `pg_type`/`pg_enum`).
- **Status:** `VERIFIED_REMOTE`

## 1. Inventário das 12 tabelas em `public`

| Tabela | Colunas | Constraints (`pg_constraint`) | Índices (`pg_indexes`) | Status |
|---|---:|---:|---:|---|
| `audit_logs` | 7 | 1 (apenas `audit_logs_pkey`) | 4 | `VERIFIED_REMOTE` |
| `bookmarks` | 3 | 3 | 3 | `VERIFIED_REMOTE` |
| `categories` | 11 | 3 | 2 | `VERIFIED_REMOTE` |
| `notifications` | 9 | 6 | 3 | `VERIFIED_REMOTE` |
| `posts` | 8 | 6 | 4 | `VERIFIED_REMOTE` |
| `profiles` | 13 | 10 | 3 | `VERIFIED_REMOTE` |
| `reports` | 13 | 10 | 10 | `VERIFIED_REMOTE` |
| `resources` | 19 | 11 | 11 | `VERIFIED_REMOTE` |
| `tags` | 4 | 4 | 2 | `VERIFIED_REMOTE` |
| `topic_tags` | 2 | 3 | 2 | `VERIFIED_REMOTE` |
| `topics` | 13 | 6 | 6 | `VERIFIED_REMOTE` |
| `votes` | 3 | 3 | 2 | `VERIFIED_REMOTE` |

## 2. ENUMs em `public` (9/9 confirmados)

- `category_scope`: `{resource,forum,both}`
- `content_status`: `{published,hidden,deleted}`
- `difficulty_level`: `{beginner,intermediate,advanced}`
- `notification_type`: `{topic_reply,solution_accepted,resource_approved,resource_rejected}`
- `report_reason`: `{spam,malicious_content,personal_data,harassment,unauthorized_attack,copyright,other}`
- `report_status`: `{open,reviewing,resolved,dismissed}`
- `resource_status`: `{pending,approved,rejected,archived}`
- `resource_type`: `{tool,repository,script,framework,documentation,lab,ctf_platform,course,article}`
- `user_role`: `{member,moderator,admin}`

## 3. Verificações estruturais críticas

- `public.profiles` possui `profiles_id_fkey`: `FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE`.
- `public.audit_logs` possui exclusivamente `audit_logs_pkey` (`PRIMARY KEY (id)`); `audit_logs_actor_id_fkey` está **ausente** (Alternativa C preservada).
- Nenhuma divergência estrutural encontrada frente às 4 migrations oficiais.
