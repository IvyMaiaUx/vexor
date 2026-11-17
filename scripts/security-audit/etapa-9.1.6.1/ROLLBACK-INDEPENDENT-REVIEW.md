# VEXOR — ETAPA 9.1.6.1: REVISÃO INDEPENDENTE DO ROLLBACK

**Artefato inspecionado:** `scripts/security-audit/etapa-9.1.6/PROPOSED-SECURITY-ROLLBACK.sql`.  
**Comparado com:** `20261110000002_functions_triggers.sql` e `20261110000003_rls_and_grants.sql`.

---

## 1. Cobertura de Objetos Verificada

1. **8 RPCs restauradas:** `admin_set_user_role`, `admin_set_user_suspension`, `moderate_resource`, `resubmit_resource`, `moderate_topic`, `moderate_post`, `set_accepted_post`, `resolve_report`.
2. **Trigger e função removidos:** `profiles_protect_last_admin_delete` e `protect_last_admin_delete()`.
3. **View e privacidade de `profiles`:** `DROP VIEW IF EXISTS public.public_profiles`, `DROP POLICY IF EXISTS profiles_select_own_or_mod`, restauração de `profiles_select_public` e `GRANT SELECT ON public.profiles TO anon, authenticated`.
4. **Grants e revokes:** explícitos para todas as 8 RPCs (`REVOKE ALL ... FROM PUBLIC, anon; GRANT EXECUTE ... TO authenticated;`).
5. **FK de `audit_logs`:** `audit_logs_actor_id_fkey` restaurada com `ON DELETE SET NULL NOT VALID`, preservando registros órfãos.

---

## 2. Igualdade Semântica vs. Igualdade Textual

Em `TEST-EXECUTION-RESULTS.json`, a comparação normalizada de `pg_get_functiondef` retornou:
- Igualdade textual exata (após normalização de espaços/caixa): `admin_set_user_role`, `moderate_topic`, `moderate_post`, `resolve_report`, `resubmit_resource`.
- Diferença de comprimento em 3 funções:
  - `admin_set_user_suspension`: `1002` bytes (original) vs `1006` bytes (rollback)
  - `moderate_resource`: `1898` bytes (original) vs `1888` bytes (rollback)
  - `set_accepted_post`: `2058` bytes (original) vs `2042` bytes (rollback)

**Análise:** A diferença decorre exclusivamente de comentários/espaçamento internos preservados pelo `pg_get_functiondef` dentro do literal `$$ ... $$` (ou formatação de `DEFAULT NULL`). Por inspeção linha a linha frente a `20261110000002_functions_triggers.sql`, **todas as 8 RPCs restauradas são semanticamente equivalentes ao baseline original**.
