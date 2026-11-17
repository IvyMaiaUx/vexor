# VEXOR — ETAPA 9.1.5.3: VALIDAÇÃO DO ROLLBACK COMPLETO

**Artefato auditado:** `scripts/security-audit/etapa-9.1.5.2/PROPOSED-ROLLBACK-COMPLETE.sql` (`SHA-256: BFC7717234C72741FDB997012FD6339289A948FB27CFB121ED57AE4815E4F9C5`).  
**Referência original comparada:** `supabase/migrations/20261110000002_functions_triggers.sql` e `20261110000003_rls_and_grants.sql`.

---

## 1. Resultado da Execução em Ambiente Isolado (`vexor_audit_9153`)

Conforme registrado em `scripts/security-audit/etapa-9.1.5.3/TEST-EXECUTION-RESULTS.json`:
- **Exit code:** `0`
- **Stderr:** `NOTA: a política "profiles_select_public" para a relação "public.profiles" não existe, ignorada` (aviso esperado do `DROP POLICY IF EXISTS` na linha 245, pois a política havia sido substituída por `profiles_select_own_or_mod` na Etapa 9.1.5).
- **Trigger `profiles_protect_last_admin_delete` restante:** `0`
- **View `public.public_profiles` restante:** `0`
- **FK restaurada em `public.audit_logs`:** `audit_logs_actor_id_fkey|validated=false`
- **RPCs administrativas/moderação ainda com `pg_advisory_xact_lock`:** `0` (todas as 6 RPCs — `admin_set_user_role`, `admin_set_user_suspension`, `moderate_resource`, `moderate_topic`, `moderate_post`, `resolve_report` — retornaram ao corpo original sem advisory lock).

---

## 2. Consistência de Assinaturas e Estratégia `NOT VALID`

1. **Assinaturas e corpos das 6 RPCs:** inspecionados frente a `20261110000002_functions_triggers.sql`; tipos de retorno (`void`), parâmetros, `SECURITY DEFINER` e `SET search_path = ''` correspondem ao original pré-9.1.5.
2. **Estratégia `NOT VALID` em `audit_logs_actor_id_fkey`:** preserva integralmente os `21` registros históricos órfãos sem violar o trigger `audit_logs_no_update_delete` e garante integridade referencial para novas inserções/exclusões após o rollback.
3. **Procedimento futuro caso deseje validar a FK (`VALIDATE CONSTRAINT`):**
   - Só é possível após reconciliar ou limpar eventuais `actor_id` sem correspondência em `public.profiles` (o que em ambiente com `audit_logs_no_update_delete` exigiria restauração a partir de backup pré-alteração, como `backup-vexor_audit-pre-9.1.5.sql`).
   - Havendo `0` órfãos, executa-se: `ALTER TABLE public.audit_logs VALIDATE CONSTRAINT audit_logs_actor_id_fkey;`.

---

## 3. Ressalva Técnica Identificada na Auditoria do Rollback

- `PROPOSED-ROLLBACK-COMPLETE.sql` foi projetado especificamente para reverter as alterações aplicadas na **Etapa 9.1.5** (`vexor_audit`).
- Como a proposta adicional da Etapa 9.1.5.2 (`PROPOSED-RPC-REVALIDATION.sql`) também altera `public.set_accepted_post` e `public.resubmit_resource`, **o script de rollback da futura migration definitiva deverá incluir também a restauração das definições originais de `set_accepted_post` e `resubmit_resource`** (presentes em `20261110000002_functions_triggers.sql`).
