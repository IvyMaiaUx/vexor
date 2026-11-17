# VEXOR — Etapa 9.7 (Revisão 2) — Reconciliação entre Especificação e SQL (`RPC-SPEC-RECONCILIATION.md`)

**Data:** 2026-11-15  
**Documentos comparados:**
- `scripts/security-audit/etapa-9-7/revision-2/RPC-SECURITY-REVISED.md`
- `scripts/security-audit/etapa-9-7/revision-2/MIGRATION-REVISED.sql`
- Referências oficiais: `supabase/migrations/20261110000002_functions_triggers.sql` e `supabase/migrations/20261113143000_security_hardening.sql`

---

## 1. Divergências identificadas na `revision-1` e corrigidas na `revision-2`

| Item | O que ocorria na `revision-1` | Correção aplicada na `revision-2` |
|---|---|---|
| **Transições de estado em `moderate_research`** | A especificação listava `'approved' -> 'rejected' \| 'archived'`, `'rejected' -> 'approved' \| 'archived'`, `'archived' -> 'approved' \| 'rejected'`, mas o SQL só bloqueava `v_prev_status = p_decision`. | Matriz padronizada e aplicada identicamente na especificação e no SQL: `pending -> approved \| rejected \| archived`; `approved -> archived`; `rejected -> archived`; `archived ->` nenhuma transição direta (`22023`). |
| **Revalidação pós-lock em `resubmit_research`** | O SQL verificava apenas `p.is_suspended` (sem `p.role` nem checagem explícita de `auth.uid() IS NOT NULL`). | Passa a checar `auth.uid() IS NOT NULL` pré-lock e `SELECT p.role, p.is_suspended ... FOR SHARE NOWAIT` pós-lock, exigindo `FOUND`, `v_caller_susp IS DISTINCT FROM false`, `v_caller_role IS NOT NULL` e `v_author_id = auth.uid()`. |
| **`search_path`** | `RPC-SECURITY-REVISED.md` e `MIGRATION-REVISED.sql` usavam `pg_catalog, public, pg_temp` (e `pg_catalog` na auxiliar), divergindo das migrations oficiais (`SET search_path = ''`). | Todas as funções e triggers passam a usar `SET search_path = ''` com qualificação explícita (`public.*`, `auth.uid()`, `extensions.unaccent()`), alinhadas 100% às migrations oficiais. |
| **Operação futura de republicação** | Não estava documentada para pesquisas `archived`. | Documentada conceitualmente na seção 2.3 de `RPC-SECURITY-REVISED.md`, sem implementação nesta etapa. |

---

## 2. Matriz de Compatibilidade Especificação × SQL (`revision-2`)

### 2.1 `public.moderate_research`

| Dimensão | Especificação (`RPC-SECURITY-REVISED.md`) | SQL (`MIGRATION-REVISED.sql`) | Status |
|---|---|---|---|
| **Assinatura da função** | `public.moderate_research(p_research_id uuid, p_decision public.research_status, p_reason text DEFAULT NULL) RETURNS void` (`LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''`) | `create or replace function public.moderate_research(p_research_id uuid, p_decision public.research_status, p_reason text default null) returns void language plpgsql security definer set search_path = ''` | **100% compatível** |
| **Tipos dos parâmetros** | `(uuid, public.research_status, text)` | `(uuid, public.research_status, text)` | **100% compatível** |
| **Ordem dos locks** | 1) `public.research_submissions FOR UPDATE` → 2) `public.profiles FOR SHARE NOWAIT` | 1) `from public.research_submissions r where r.id = p_research_id for update` → 2) `from public.profiles p where p.id = auth.uid() for share nowait` | **100% compatível** |
| **Códigos de erro** | `42501` (pré/pós-lock não moderador ou suspenso), `22023` (decisão inválida, motivo `< 5` chars na rejeição, estado redundante ou transição proibida), `P0002` (não encontrado), `55P03` (contenção `NOWAIT`) | `42501`, `22023`, `P0002` explícitos; `55P03` nativo do `FOR SHARE NOWAIT` | **100% compatível** |
| **Transições de estado** | `pending -> approved \| rejected \| archived`; `approved -> archived`; `rejected -> archived`; `archived ->` bloqueado | Valida `v_prev_status = p_decision`, `v_prev_status = 'archived'` e `v_prev_status in ('approved', 'rejected') and p_decision <> 'archived'` (`22023`) | **100% compatível** |
| **Campos atualizados** | `status`, `reviewed_by`, `reviewed_at`, `rejection_reason` (`v_clean_reason` em `rejected`, senão `NULL`), `published_at` (`coalesce(r.published_at, now())` em `approved`, senão preserva) | Atualiza exatamente esses 5 campos com a mesma regra condicional; preserva `id`, `slug`, `author_id` | **100% compatível** |
| **Auditoria** | `write_audit_log('research.' || p_decision::text, 'research', p_research_id, jsonb_build_object('from', v_prev_status, 'to', p_decision, 'reason', v_clean_reason))` | Idêntico na mesma transação | **100% compatível** |
| **Notificações** | Apenas para `approved`/`rejected` quando `v_author_id IS NOT NULL AND v_author_id <> auth.uid()` e autor com `NOT is_suspended` | Idêntico na mesma transação (`'research_approved'` / `'research_rejected'`) | **100% compatível** |
| **Privilégios de execução** | `REVOKE ALL ... FROM PUBLIC, anon;` + `GRANT EXECUTE ... TO authenticated;` | `revoke all on function public.moderate_research(uuid, public.research_status, text) from public, anon;` + `grant execute ... to authenticated;` | **100% compatível** |

---

### 2.2 `public.resubmit_research`

| Dimensão | Especificação (`RPC-SECURITY-REVISED.md`) | SQL (`MIGRATION-REVISED.sql`) | Status |
|---|---|---|---|
| **Assinatura da função** | `public.resubmit_research(p_research_id uuid, p_category_id uuid, p_title_pt text, p_summary_pt text, p_body_pt text, p_domain public.research_domain, p_severity public.research_severity, p_tlp public.research_tlp, p_title_en text DEFAULT NULL, p_summary_en text DEFAULT NULL, p_body_en text DEFAULT NULL, p_cves text[] DEFAULT '{}', p_attack_techniques text[] DEFAULT '{}', p_source_references jsonb DEFAULT '[]'::jsonb, p_confidence_level text DEFAULT NULL, p_methodology text DEFAULT NULL, p_read_time_minutes integer DEFAULT 10) RETURNS void` | Assinatura, ordem, defaults, `language plpgsql`, `security definer` e `set search_path = ''` idênticos | **100% compatível** |
| **Tipos dos parâmetros** | 17 parâmetros tipados na ordem exata | 17 parâmetros na mesma ordem e tipos exatos | **100% compatível** |
| **Ordem dos locks** | 1) `public.research_submissions FOR UPDATE` → 2) `public.profiles FOR SHARE NOWAIT` | 1) `from public.research_submissions r where r.id = p_research_id for update` → 2) `from public.profiles p where p.id = auth.uid() for share nowait` | **100% compatível** |
| **Códigos de erro** | `42501` (não membro ativo pré/pós-lock ou não autor), `P0002` (pesquisa não encontrada), `22023` (status diferente de `'rejected'` ou violações de trigger/CHECK), `55P03` (contenção `NOWAIT`) | `42501`, `P0002`, `22023` explícitos + `55P03` nativo do `FOR SHARE NOWAIT` | **100% compatível** |
| **Transições de estado** | Apenas `rejected -> pending` | `if v_prev_status <> 'rejected'` → `22023`; atualiza `status = 'pending'` | **100% compatível** |
| **Campos atualizados** | 16 campos de conteúdo + `status = 'pending'`, `rejection_reason = NULL`, `reviewed_by = NULL`, `reviewed_at = NULL`; preserva `id`, `slug`, `author_id`, `published_at` | Atualiza exatamente os 16 campos de conteúdo + os 4 campos de revisão/status; preserva `id`, `slug`, `author_id`, `published_at` | **100% compatível** |
| **Auditoria** | `write_audit_log('research.resubmitted', 'research', p_research_id, jsonb_build_object('from', v_prev_status, 'to', 'pending'))` | Idêntico na mesma transação | **100% compatível** |
| **Notificações** | Não gera notificação | Não insere em `public.notifications` | **100% compatível** |
| **Privilégios de execução** | `REVOKE ALL ... FROM PUBLIC, anon;` + `GRANT EXECUTE ... TO authenticated;` | Lista exata dos 17 tipos no `REVOKE ALL` e `GRANT EXECUTE ... TO authenticated` | **100% compatível** |

---

## 3. Conclusão da Verificação

Especificação (`RPC-SECURITY-REVISED.md`) e artefato SQL (`MIGRATION-REVISED.sql`) da `revision-2` estão 100% reconciliados em assinatura, tipos, ordem de locks, códigos de erro, matriz de transições, campos atualizados, auditoria, notificações, privilégios de execução e padrão `SET search_path = ''`.
