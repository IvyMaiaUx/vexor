# VEXOR — ETAPA 9.1.8.1: INVENTÁRIO DO POSTGRESQL REMOTO (FASE C)

**Fontes observadas (somente leitura via CLI):**
- `npx supabase inspect db db-stats --remote`
- `npx supabase inspect db table-stats --remote`
- `npx supabase inspect db index-stats --remote`
- `npx supabase inspect db role-stats --remote`
- *(Nota: `supabase db dump --linked --schema public` falhou por `DockerRunError` porque o Docker Desktop não está em execução localmente.)*

---

## 1. Estado Geral e Métricas Observadas
- `database_size`: `10 MB`
- `total_table_size`: `0 bytes`
- `total_index_size`: `0 bytes`
- `total_toast_size`: `0 bytes`
- `table-stats`: `rows: []` (**nenhuma tabela de usuário existente**)
- `index-stats`: `rows: []` (**nenhum índice de usuário existente**)

## 2. Tabelas Esperadas (12)
`profiles`, `categories`, `resources`, `topics`, `posts`, `tags`, `topic_tags`, `votes`, `bookmarks`, `reports`, `notifications`, `audit_logs`: **NÃO EXISTEM** no banco remoto (`table-stats` retornou `[]` e `total_table_size = 0 bytes`).

## 3. Roles Observadas (`role-stats`)
Roles canônicas do Supabase presentes: `anon`, `authenticated`, `authenticator` (`session_preload_libraries=supautils, safeupdate, statement_timeout=8s, lock_timeout=8s`), `service_role`, `supabase_auth_admin`, `supabase_storage_admin`, `supabase_admin`, `postgres`, `supabase_read_only_user`, `cli_login_postgres`.

## 4. Objetos de Catálogo Não Listáveis via `inspect db`
Como `db dump` exigia Docker Desktop e não foi usada conexão `psql` direta (sem senha do banco no `.env.local`):
- **Extensões instaladas (`pgcrypto`, `citext`, `unaccent`):** `NÃO VERIFICADO`
- **ENUMs, funções, triggers e views isoladas em `public`:** `NÃO VERIFICADO` (com `0` tabelas de usuário e `0` migrations aplicadas, não há indício de objetos das migrations do Vexor).
