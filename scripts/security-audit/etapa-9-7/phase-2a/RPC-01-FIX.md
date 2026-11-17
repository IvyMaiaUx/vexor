# VEXOR — Etapa 9.7 (Fase 2A) — Correção Pontual `RPC-01`

**Data:** 2026-11-16  
**Arquivo original preservado:** `scripts/security-audit/etapa-9-7/revision-4/PROPOSED-MIGRATION-REVISION-4.sql`  
**Cópia de trabalho testada:** `scripts/security-audit/etapa-9-7/phase-2a/PROPOSED-MIGRATION-2A-TEST.sql`

---

## 1. Alteração Aplicada (Exclusivamente `RPC-01`)

Em `public.moderate_research(uuid, public.research_status, text)` (linha 391):

**Antes (`revision-4`):**
```sql
if p_decision not in ('approved', 'rejected', 'archived') then
  raise exception 'invalid decision: %', p_decision using errcode = '22023';
end if;
```

**Depois (`PROPOSED-MIGRATION-2A-TEST.sql`):**
```sql
if p_decision is null or p_decision not in ('approved', 'rejected', 'archived') then
  raise exception 'invalid decision: %', p_decision using errcode = '22023';
end if;
```

## 2. Validação Executada

- Cenário **`RPC-01`** executado no PostgreSQL 18.6 (`vexor_audit_97_2a`):
  - Chamada: `SELECT public.moderate_research(ID_PENDING, NULL, 'teste');` (como `moderator`).
  - Resultado esperado: `SQLSTATE 22023`.
  - Resultado obtido: `SQLSTATE 22023` — **PASS**.
