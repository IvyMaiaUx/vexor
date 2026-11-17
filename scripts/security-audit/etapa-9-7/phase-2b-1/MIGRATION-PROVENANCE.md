# VEXOR — Etapa 9.7 (Fase 2B.1) — Proveniência da Migration Oficial

**Data:** 2026-11-16  

---

## 1. Identificação dos Artefatos

- **Migration oficial criada:** `supabase/migrations/20261116114600_research_submissions.sql` (`27.886` bytes)
- **SQL de origem aprovado e testado:** `scripts/security-audit/etapa-9-7/phase-2a/PROPOSED-MIGRATION-2A-TEST.sql` (`27.886` bytes)
- **Proposta base auditada (Revisão 4):** `scripts/security-audit/etapa-9-7/revision-4/PROPOSED-MIGRATION-REVISION-4.sql`

---

## 2. Integridade Criptográfica (SHA-256)

| Arquivo | Algoritmo | Hash SHA-256 |
|---|---|---|
| `scripts/security-audit/etapa-9-7/phase-2a/PROPOSED-MIGRATION-2A-TEST.sql` | `SHA256` | `C2D8BFD47EAA588CDCF4562E5CAE25615E80578C2700EEA036AD975BFD7FD100` |
| `supabase/migrations/20261116114600_research_submissions.sql` | `SHA256` | `C2D8BFD47EAA588CDCF4562E5CAE25615E80578C2700EEA036AD975BFD7FD100` |

**Resultado:** Hashes **100% idênticos** (cópia byte a byte, sem modificações adicionais).

---

## 3. Diferenças Identificadas

1. Entre `PROPOSED-MIGRATION-2A-TEST.sql` e `supabase/migrations/20261116114600_research_submissions.sql`: **0 diferenças**.
2. Entre `revision-4/PROPOSED-MIGRATION-REVISION-4.sql` e `PROPOSED-MIGRATION-2A-TEST.sql`: **exclusivamente a correção `RPC-01`** na linha 391 (`if p_decision is null or p_decision not in ('approved', 'rejected', 'archived') then`), validada com sucesso na Fase 2A (`20/20` cenários aprovados no PostgreSQL 18.6 local).

---

## 4. Dependências e Ordem de Execução

1. Depende integralmente das 4 migrations anteriores já aplicadas:
   - `20261110000001_schema.sql`
   - `20261110000002_functions_triggers.sql`
   - `20261110000003_rls_and_grants.sql`
   - `20261113143000_security_hardening.sql`
2. **Regra transacional de `ALTER TYPE`:** os valores `'research'` (`category_scope`) e `'research_approved'`/`'research_rejected'` (`notification_type`) adicionados no início da migration são referenciados apenas dentro de corpos PL/pgSQL (`research_protect_fields`, `moderate_research`). Qualquer `INSERT` de seed em `public.categories` usando `scope = 'research'` deverá rodar em transação/etapa posterior ao commit desta migration.
