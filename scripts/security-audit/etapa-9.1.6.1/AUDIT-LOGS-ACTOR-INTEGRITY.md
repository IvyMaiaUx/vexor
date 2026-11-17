# VEXOR — ETAPA 9.1.6.1: INTEGRIDADE DE ATOR E IMUTABILIDADE EM `public.audit_logs`

**Evidência:** `scripts/security-audit/etapa-9.1.6.1/TEST-EXECUTION-RESULTS.json` e inspeção de `20261110000002_functions_triggers.sql` e `20261110000003_rls_and_grants.sql`.

---

## 1. Origem Confiável da Identidade (`write_audit_log`)

1. `public.write_audit_log(p_action text, p_entity_type text, p_entity_id uuid DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb)` é `SECURITY DEFINER`, `SET search_path = ''`, e **obtém `actor_id` exclusivamente de `auth.uid()`** (sem parâmetro de ator).
2. **`has_function_privilege` verificado:**
   - `public:EXECUTE=false`
   - `anon:EXECUTE=false`
   - `authenticated:EXECUTE=false`
3. Nenhum cliente `anon` ou `authenticated` pode invocar `write_audit_log` diretamente nem escolher `actor_id` arbitrário. Todas as RPCs `SECURITY DEFINER` que chamam `write_audit_log` (`admin_set_user_role`, `admin_set_user_suspension`, `moderate_resource`, `moderate_topic`, `moderate_post`, `resolve_report`, `set_accepted_post`, `on_category_changed`) validam autorização antes da chamada.

---

## 2. Imutabilidade (`append-only`) e Preservação de UUID Histórico

- **Exclusão de ator após registro:** após `moderate_topic` gravar log para `U_ADM2`, `DELETE FROM auth.users WHERE id = U_ADM2` executou sem erro (`actor_delete_has_error = false`).
- **Preservação do registro histórico:** `orphan_rows_preserved = 1`.
- **Identificação via `LEFT JOIN`:** `SELECT a.action || '|' || coalesce(p.username,'DELETED_USER') ... LEFT JOIN public.profiles p ON p.id=a.actor_id` retornou `topic.pin|DELETED_USER`.
- **Bloqueio de `UPDATE` e `DELETE`:** sobre o registro existente em `public.audit_logs`, tanto `UPDATE` quanto `DELETE` (mesmo como superuser) foram bloqueados pelo trigger `audit_logs_no_update_delete` com **`SQLSTATE 42501`**.
