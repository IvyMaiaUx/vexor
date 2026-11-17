# Auditoria do Banco e Supabase (Somente Leitura) — Etapa 8

## 1. Migrações Inspecionadas

- `supabase/migrations/20261110000001_schema.sql`
- `supabase/migrations/20261110000002_functions_triggers.sql`
- `supabase/migrations/20261110000003_rls_and_grants.sql`
- `supabase/migrations/20261113143000_security_hardening.sql`

## 2. Verificações Estruturais

1. **ENUMs e Tabelas:**
   - `public.user_role` (`'member'`, `'moderator'`, `'admin'`), `public.resource_status` (`'pending'`, `'approved'`, `'rejected'`, `'archived'`), `public.content_status` (`'published'`, `'hidden'`, `'deleted'`), `public.report_status`, `public.report_reason`.
   - `public.profiles`, `public.resources`, `public.topics`, `public.posts`, `public.reports`, `public.notifications`, `public.audit_logs`.
2. **Hardening (`20261113143000_security_hardening.sql`):**
   - Proteção do último administrador ativo (`admin_set_user_role`, `admin_set_user_suspension` + `pg_advisory_xact_lock` + trigger `BEFORE DELETE`).
   - View `public.public_profiles` com `security_invoker = false`, `security_barrier = true`, sem expor `role` ou `is_suspended`.
   - `public.audit_logs` mantida append-only (sem FK `audit_logs_actor_id_fkey`, preservando trilha histórica imutável).
3. **Alinhamento Aplicação vs. Banco:**
   - Tipos em `src/features/admin/types.ts` e `src/types/database.types.ts` alinhados aos ENUMs oficiais.
   - Nota: `cybercrime_research` e os serviços administrativos (`adminDataProvider`) operam em camada demonstrativa em memória nesta fase, sem tabelas ou alterações fictícias nas migrations oficiais.
4. **Proibições respeitadas:** Nenhuma migration criada/alterada e nenhum SQL remoto executado.
