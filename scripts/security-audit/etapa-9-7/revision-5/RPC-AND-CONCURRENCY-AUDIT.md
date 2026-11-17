# VEXOR — Etapa 9.7 (Revisão 5) — Auditoria de RPCs e Concorrência

**Data:** 2026-11-16  
**Artefato auditado:** `scripts/security-audit/etapa-9-7/revision-4/PROPOSED-MIGRATION-REVISION-4.sql` (linhas 370-740).  
**Comparação oficial:** `20261110000002_functions_triggers.sql` e `20261113143000_security_hardening.sql`.

---

## 1. Auditoria das 4 RPCs `SECURITY DEFINER`

1. **`moderate_research` (linhas 370-469):**
   - Pré-lock: `auth.uid() is null or not public.is_moderator()` (`42501`).
   - Lock 1: `research_submissions FOR UPDATE` (`P0002` se `NOT FOUND`).
   - Lock 2 (V4): `profiles FOR SHARE NOWAIT` verificando `not found or v_caller_susp is distinct from false or v_caller_role is null or v_caller_role not in ('moderator', 'admin')` (`42501`).
   - Matriz de transições: `pending -> approved | rejected | archived`; `approved -> archived`; `rejected -> archived`; `archived ->` bloqueado; redundância bloqueada (`22023`).
2. **`resubmit_research` (linhas 471-564):**
   - Pré-lock: `auth.uid() is null or not public.is_active_member()` (`42501`).
   - Lock 1: `research_submissions FOR UPDATE` (`P0002`).
   - Lock 2 (V4): `profiles FOR SHARE NOWAIT` verificando `not found or v_caller_susp is distinct from false or v_caller_role is null or v_caller_role not in ('member', 'moderator', 'admin')` (`42501`).
   - Autoria: `v_author_id is null or v_author_id <> auth.uid()` (`42501`).
   - Estado: `v_prev_status <> 'rejected'` (`22023`).
3. **`grant_research_recipient` (linhas 566-680) e `revoke_research_recipient` (linhas 682-740):**
   - Mesma validação pré-lock, Lock 1 (`FOR UPDATE`), Lock 2 (`FOR SHARE NOWAIT` com checagem explícita de `v_caller_role is null`) e `grant_research_recipient` também adquire `FOR SHARE NOWAIT` no perfil destinatário.
   - Sem ciclo AB-BA com `admin_set_user_role` / `admin_set_user_suspension`.
   - `SQLSTATE 55P03` documentado para mapeamento HTTP `409 Conflict` na Fase 2B.

---

## 2. Achados

| ID | Severidade | Arquivo / Trecho | Impacto / Cenário de Falha | Correção Recomendada |
|---|---|---|---|---|
| **RPC-01** | `LOW` | `PROPOSED-MIGRATION-REVISION-4.sql:391` (`moderate_research`) | `if p_decision not in ('approved', 'rejected', 'archived')` avalia para `NULL` se `p_decision IS NULL`. Não há bypass de segurança (pois `is_moderator()` já executou e a coluna `status` é `NOT NULL`), porém falha com `23502 not_null_violation` no `UPDATE` em vez de `22023 invalid decision`. | Alterar para `if p_decision is null or p_decision not in ('approved', 'rejected', 'archived') then`. |
