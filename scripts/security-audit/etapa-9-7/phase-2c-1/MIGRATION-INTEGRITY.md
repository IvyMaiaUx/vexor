# VEXOR — Etapa 9.7 (Fase 2C.1) — Integridade da Migration e Compatibilidade com a Aplicação

**Data:** 2026-11-16  

---

## 1. Verificação Criptográfica e Existência

| Item | Resultado |
|---|---|
| **Arquivo** | `supabase/migrations/20261116114600_research_submissions.sql` |
| **Tamanho** | `27.886` bytes |
| **SHA-256 esperado** | `C2D8BFD47EAA588CDCF4562E5CAE25615E80578C2700EEA036AD975BFD7FD100` |
| **SHA-256 observado** | `C2D8BFD47EAA588CDCF4562E5CAE25615E80578C2700EEA036AD975BFD7FD100` |
| **Integridade** | **100% idêntico** — nenhuma modificação posterior à Fase 2B.1 |

---

## 2. Compatibilidade com Migrations Oficiais e Schema

- Depende exclusivamente de:
  1. `20261110000001_schema.sql`
  2. `20261110000002_functions_triggers.sql`
  3. `20261110000003_rls_and_grants.sql`
  4. `20261113143000_security_hardening.sql`
- Nenhum objeto novo colide com os nomes existentes nas 4 migrations (`research_submissions`, `research_recipients`, `research_status`, `research_domain`, `research_severity`, `research_tlp`, `is_research_author`, `moderate_research`, `resubmit_research`, `grant_research_recipient`, `revoke_research_recipient`).

---

## 3. Conferência de Nomes e Assinaturas com a Aplicação (`src/`)

| Objeto na Migration `20261116114600` | Uso na Aplicação (`src/`) | Status |
|---|---|---|
| `public.research_submissions` (27 colunas; 16 graváveis) | `research-repository.ts`, `admin-server-handlers.ts` | **Compatível** |
| `public.research_recipients` (7 colunas) | `research-repository.ts` | **Compatível** |
| `public.resubmit_research(p_research_id, p_category_id, ...)` (17 params) | `research-repository.ts:482` | **Compatível** |
| `public.moderate_research(p_research_id, p_decision, p_reason)` | `admin-server-handlers.ts:911` | **Compatível** |
| `public.grant_research_recipient(p_research_id, p_user_id, p_justification)` | `research-repository.ts:512` | **Compatível** |
| `public.revoke_research_recipient(p_research_id, p_user_id)` | `research-repository.ts:526` | **Compatível** |
| `public.reports.research_id` | `report-service.ts:199` | **Compatível** |
| `public.notifications.research_id` + `research_approved`/`research_rejected` | `notification-service.ts`, `notification-bell.tsx` | **Compatível** |
| `public.categories.scope` (`'research'`, `'both'`) | `research-repository.ts:540` | **Compatível** |

*(Nota: os testes da Fase 2B.2 usaram mocks em memória e não substituem a validação pós-aplicação no Supabase remoto.)*
