# VEXOR — ETAPA 9.1.8.1: AUDITORIA DE RLS E PRIVILÉGIOS REMOTOS (FASE D)

1. **Tabelas de usuário (`profiles` .. `audit_logs`):** conforme `inspect db table-stats --remote` (`rows: []`, `total_table_size: 0 bytes`), nenhuma das 12 tabelas existe ainda no banco remoto. Portanto, policies RLS e `GRANT`s sobre essas tabelas **ainda não existem** no remoto.
2. **Roles e limites observados (`inspect db role-stats --remote`):**
   - `anon`: `statement_timeout=3s`
   - `authenticated`: `statement_timeout=8s`
   - `authenticator`: `session_preload_libraries=supautils, safeupdate, statement_timeout=8s, lock_timeout=8s`
   - `service_role`, `postgres`, `supabase_admin`, `supabase_auth_admin`, `supabase_storage_admin` presentes.
3. **Verificação granular em `pg_policies` / `information_schema.table_privileges`:** `NÃO VERIFICADO` via SQL direto (sem conexão `psql` direta e sem Docker para `db dump`).
4. **Impacto:** como o banco remoto ainda não recebeu as Migrations 1 a 4, todas as proteções de RLS, `public_profiles`, `audit_logs` e RPCs serão criadas no momento da aplicação sequencial das 4 migrations.
