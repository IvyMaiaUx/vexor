# VEXOR — Etapa 9.7 (Revisão 3.1) — Relatório de Varredura de `NOT IN (...)` e `role NULL`

**Data:** 2026-11-16  
**Arquivo auditado:** `scripts/security-audit/etapa-9-7/revision-3/PROPOSED-MIGRATION-REVISED.sql`

---

## 1. Inventário Completo de Ocorrências `not in` na Proposta SQL

| Linha (rev-3) | Contexto | Expressão Original | Variável pode ser `NULL`? | Risco de Autorização Indevida? | Decisão na `revision-3-1` |
|---|---|---|---|---|---|
| **162** | `research_protect_fields()` | `if v_key not in ('title', 'url', 'isExternal')` | Não (`jsonb_object_keys()` nunca retorna `NULL`) | Não | **Mantida inalterada** |
| **184** | `research_protect_fields()` | `jsonb_typeof(v_ref -> 'isExternal') not in ('boolean', 'null')` | Não (`v_ref ? 'isExternal'` garante existência; `jsonb_typeof` retorna tipo não nulo) | Não | **Mantida inalterada** |
| **382** | `moderate_research()` | `if p_decision not in ('approved', 'rejected', 'archived')` | Sim (`p_decision` pode ser `NULL` na chamada), mas falha depois em `NOT NULL` (`23502`) após exigir `is_moderator()` | Não (não concede autorização) | **Mantida inalterada** conforme escopo estrito (documentada como validação de entrada) |
| **403** | `moderate_research()` pós-lock | `if not found or v_caller_susp is distinct from false or v_caller_role not in ('moderator', 'admin')` | Sim (`v_caller_role` pode ser `NULL`) | **Sim (bypass da checagem de papel em `IF NULL`)** | **Corrigida** com `or v_caller_role is null` |
| **589** | `grant_research_recipient()` pós-lock | `if not found or v_caller_susp is distinct from false or v_caller_role not in ('moderator', 'admin')` | Sim (`v_caller_role` pode ser `NULL`) | **Sim (bypass da checagem de papel em `IF NULL`)** | **Corrigida** com `or v_caller_role is null` |
| **651** | `revoke_research_recipient()` pós-lock | `if not found or v_caller_susp is distinct from false or v_caller_role not in ('moderator', 'admin')` | Sim (`v_caller_role` pode ser `NULL`) | **Sim (bypass da checagem de papel em `IF NULL`)** | **Corrigida** com `or v_caller_role is null` |

---

## 2. Verificação de `public.resubmit_research`

Na linha 507 da proposta base:
```sql
if not found or v_caller_susp is distinct from false or v_caller_role is null then
  raise exception 'forbidden' using errcode = '42501';
end if;
```
- Já rejeita `NOT FOUND`, `is_suspended` diferente de `false` e `v_caller_role IS NULL`.
- Preserva a semântica de `public.is_active_member()` (aceita qualquer `user_role` válido, desde que ativo e autor da pesquisa).
- **Mantida inalterada.**
