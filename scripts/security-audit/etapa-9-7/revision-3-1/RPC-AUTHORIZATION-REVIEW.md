# VEXOR — Etapa 9.7 (Revisão 3.1) — Revisão de Autorização e Concorrência nas RPCs

**Data:** 2026-11-16  
**Base:** `scripts/security-audit/etapa-9-7/revision-3/RPC-AUTHORIZATION-REVIEW.md`  
**Migrations oficiais inspecionadas:**
- `supabase/migrations/20261110000002_functions_triggers.sql`
- `supabase/migrations/20261113143000_security_hardening.sql`

---

## 1. Correção Aplicada: Rejeição Explícita de `v_caller_role IS NULL`

Em PL/pgSQL (lógica ternária SQL — 3VL), a expressão `v_caller_role NOT IN ('moderator', 'admin')` avalia para **`NULL`** quando `v_caller_role` é `NULL`. Em uma cláusula `IF cond1 OR cond2 OR NULL THEN`, se `cond1` e `cond2` forem `false`, o resultado completo é `NULL` e o bloco `RAISE EXCEPTION 'forbidden'` **não é executado**.

Na `revision-3-1`, a validação pós-lock de `public.moderate_research`, `public.grant_research_recipient` e `public.revoke_research_recipient` passa a exigir explicitamente:

```sql
if not found
   or v_caller_susp is distinct from false
   or v_caller_role is null
   or v_caller_role not in ('moderator', 'admin') then
  raise exception 'forbidden' using errcode = '42501';
end if;
```

Isso garante rejeição uniforme (`42501`) para os 4 casos:
1. Perfil inexistente (`NOT FOUND`);
2. Perfil suspenso (`v_caller_susp IS DISTINCT FROM false`);
3. Papel inexistente (`v_caller_role IS NULL`);
4. Papel diferente de `'moderator'` e `'admin'`.

---

## 2. Revisão de `public.resubmit_research`

Inspecionada `public.resubmit_research` em conjunto com `public.is_active_member()` (`20261110000002_functions_triggers.sql:49-60`):
- **Pré-lock:** `if auth.uid() is null or not public.is_active_member() then raise exception 'forbidden' using errcode = '42501'; end if;`
- **Pós-lock:** `if not found or v_caller_susp is distinct from false or v_caller_role is null then raise exception 'forbidden' using errcode = '42501'; end if;`
- **Autoria:** `if v_author_id is null or v_author_id <> auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;`
- **Semântica preservada:** não exige `role = 'member'`, mantendo compatibilidade integral com `is_active_member()` (membros, moderadores e administradores não suspensos podem reenviar suas próprias pesquisas rejeitadas).

---

## 3. Concorrência, Ordem dos Locks e `SQLSTATE 55P03`

- **Ordem preservada:** `public.research_submissions ... FOR UPDATE` → `public.profiles ... FOR SHARE NOWAIT` (coerente com `moderate_resource` e `resubmit_resource` em `20261113143000_security_hardening.sql`).
- **Sem novos locks:** nenhum `pg_advisory_xact_lock` ou alteração de ordem foi introduzido.
- **Tratamento de `SQLSTATE 55P03`:** contenção simultânea com `admin_set_user_role` ou `admin_set_user_suspension` (`FOR UPDATE NOWAIT` sobre `profiles`) aborta imediatamente com `55P03` (`lock_not_available`), que a camada de Route Handler deve mapear para HTTP `409 Conflict`.
