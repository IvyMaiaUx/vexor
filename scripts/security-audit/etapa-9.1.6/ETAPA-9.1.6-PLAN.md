# VEXOR — ETAPA 9.1.6: PLANO TÉCNICO DE CONSOLIDAÇÃO

**Objetivo:** Consolidar todas as correções de segurança aprovadas nas Etapas 9.1.3.6 – 9.1.5.4 em uma proposta completa de migration SQL (`PROPOSED-SECURITY-MIGRATION.sql`) e seu rollback completo (`PROPOSED-SECURITY-ROLLBACK.sql`), validando tudo em banco temporário isolado (`vexor_audit_916`) sem alterar `vexor_audit`, `supabase/migrations/`, `supabase/seed.sql`, `src/` ou o Supabase remoto.

---

## Fases do Plano
1. **Inventário e Baseline (`BASELINE-INVENTORY.md`):** registrar hashes SHA-256 das 3 migrations originais e `seed.sql`, mapear objetos afetados e diferenciar baseline original, estado experimental 9.1.5 e estado final esperado.
2. **Consolidação SQL (`PROPOSED-SECURITY-MIGRATION.sql`):**
   - **V1 & V3:** `admin_set_user_role`, `admin_set_user_suspension`, `protect_last_admin_delete` + trigger `profiles_protect_last_admin_delete` com `pg_advisory_xact_lock(6216471958360507469)`.
   - **V4:** `moderate_resource`, `moderate_topic`, `moderate_post`, `resolve_report` com revalidação pós-lock (`FOR SHARE NOWAIT` em `public.profiles`).
   - **Revalidação complementar:** `resubmit_resource` e `set_accepted_post` com lock no alvo (`FOR UPDATE`) e revalidação pós-lock em `public.profiles` (`FOR SHARE NOWAIT`).
   - **V2:** `REVOKE SELECT ON public.profiles FROM anon`, policy `profiles_select_own_or_mod`, view `public.public_profiles` (`security_invoker = false`, `security_barrier = true`, omitindo `role` e `is_suspended`).
   - **V5 (Alternativa C aprovada):** `DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey`, mantendo `audit_logs` 100% append-only.
   - **Grants explícitos:** `REVOKE ALL` / `GRANT EXECUTE` em todas as 8 RPCs e `REVOKE ALL` em `protect_last_admin_delete()`.
3. **Rollback Completo (`PROPOSED-SECURITY-ROLLBACK.sql`):** restauração integral das 8 RPCs originais, remoção de trigger/view novos, restauração da policy/grants de `profiles` e recriação de `audit_logs_actor_id_fkey` com `NOT VALID`.
4. **Validação em Ambiente Isolado (`vexor_audit_916`):** execução integral a partir do bootstrap limpo das 3 migrations originais, testes 8.1 a 8.6 e descarte do banco temporário.
5. **Regressão Frontend (`tsc`, `lint`, `next build`) e Integridade Final (`INTEGRITY-AND-HASH-CHECK.json`, `ETAPA-9.1.6-FINAL-REPORT.md`).**
