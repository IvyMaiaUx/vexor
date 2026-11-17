# VEXOR — ETAPA 9.1.8.1: AUDITORIA DE AUTH E STORAGE REMOTOS (FASE E)

## 1. Supabase Auth
- **Roles administrativas observadas (`role-stats`):** `supabase_auth_admin` (`search_path=auth,idle_in_transaction_session_timeout=60000,log_statement=none`) presente e ativo.
- **Metadados internos de `auth.users`, `auth.uid()` e `auth.role()`:** `NÃO VERIFICADO` via consulta SQL direta (sem Docker para `db dump` e sem `psql` direto).
- **Trigger `handle_new_user`:** ainda não existe no remoto porque `20261110000002_functions_triggers.sql` não foi aplicada.

## 2. Supabase Storage
- **Role administrativa observada (`role-stats`):** `supabase_storage_admin` (`search_path=storage,log_statement=none`) presente.
- **Listagem de buckets (`npx supabase storage ls --remote --experimental`):** retornou `{"paths":[]}` (`exit_code = 0`).
- **Bucket `avatars`:** **NÃO EXISTE** no remoto (será criado pela Migration 3 `20261110000003_rls_and_grants.sql`, com `public = true`, `file_size_limit = 2097152` e MIME types `image/png`, `image/jpeg`, `image/webp`).
- **Policies de `storage.objects`:** ainda não criadas (dependem da Migration 3).
