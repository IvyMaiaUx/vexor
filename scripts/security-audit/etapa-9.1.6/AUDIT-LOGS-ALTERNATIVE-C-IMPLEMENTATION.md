# VEXOR — ETAPA 9.1.6: IMPLEMENTAÇÃO DA ALTERNATIVA C EM `public.audit_logs`

**Decisão formalmente aprovada:** Manter `public.audit_logs.actor_id` (`uuid`) sem chave estrangeira para `public.profiles` ou `auth.users`.

---

## 1. Implementação na Proposta de Migration (`PROPOSED-SECURITY-MIGRATION.sql`)

```sql
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;
```

A ausência da FK representa uma **escolha deliberada de preservação histórica**, e não um descuido de integridade:
- Mantém `public.audit_logs` 100% *append-only* sob proteção dos triggers `audit_logs_no_update_delete` e `audit_logs_no_truncate`.
- Permite a exclusão legítima de contas que já atuaram como moderadores/administradores sem conflito com `ON DELETE SET NULL`.

---

## 2. Verificação de Falsificação de Identidade e Permissões

1. **`public.write_audit_log(p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb)`:**
   - Definida em `20261110000002_functions_triggers.sql` com `SECURITY DEFINER`, `SET search_path = ''`.
   - Obtém o ator diretamente de `auth.uid()` (sem parâmetro `p_actor_id`), impossibilitando spoofing por argumentos.
   - Em `20261110000003_rls_and_grants.sql`, possui `REVOKE ALL ON FUNCTION public.write_audit_log(...) FROM PUBLIC, anon, authenticated;`.
2. **Acesso direto à tabela `public.audit_logs`:**
   - RLS habilitado; apenas administradores possuem `SELECT` (`audit_logs_select_admin`).
   - Não há políticas de `INSERT`, `UPDATE` ou `DELETE` para `anon` ou `authenticated`.
   - Testado em `vexor_audit_916` (`TEST-EXECUTION-RESULTS.json`): tentativa de chamada direta a `public.write_audit_log(...)` como `authenticated` retornou `SQLSTATE 42501`; `UPDATE` e `DELETE` retornaram `SQLSTATE 42501` pelo trigger append-only.
3. **Consultas com `LEFT JOIN`:**
   - Testado em `vexor_audit_916`: após `DELETE FROM auth.users` do ator `U_ADM2`, o registro em `audit_logs` permaneceu preservado (`logs_preserved_after_actor_delete = 1`) e `LEFT JOIN public.profiles` retornou `topic.accepted_post_changed|DELETED_USER`.
