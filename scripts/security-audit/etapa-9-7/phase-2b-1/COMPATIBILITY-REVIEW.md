# VEXOR — Etapa 9.7 (Fase 2B.1) — Revisão de Compatibilidade

**Data:** 2026-11-16  
**Migration verificada:** `supabase/migrations/20261116114600_research_submissions.sql`

---

## 1. Compatibilidade com as 4 Migrations Oficiais

| Dimensão | Compatibilidade | Evidência |
|---|---|---|
| **Extensões** | **Compatível** | Utiliza `extensions.unaccent()` definida em `20261110000001_schema.sql:15` (`with schema extensions`) |
| **ENUMs e `ALTER TYPE`** | **Compatível** | Cria `research_status`, `research_domain`, `research_severity`, `research_tlp`; estende `category_scope` (`'research'`) e `notification_type` (`'research_approved'`, `'research_rejected'`) com `add value if not exists` |
| **Constraints e Índices** | **Compatível** | Constraints e índices com prefixo `research_*` sem colisão de nomes; `research_valid_code_array` imutável para `CHECK` |
| **Triggers** | **Compatível** | `research_before_insert_slug`, `research_protect_fields_trigger` e `research_set_updated_at` (reutilizando `public.set_updated_at()` da Migration 02) |
| **RLS, GRANTs e REVOKEs** | **Compatível** | `REVOKE ALL` baseline em `research_submissions` e `research_recipients`; `is_research_author(uuid)` quebra recursão RLS sem expor dados |
| **RPCs e Privilégios** | **Compatível** | `moderate_research`, `resubmit_research`, `grant_research_recipient`, `revoke_research_recipient` com `SECURITY DEFINER`, `SET search_path = ''`, padrão V4 (`FOR UPDATE` → `FOR SHARE NOWAIT`), `REVOKE ALL FROM PUBLIC, anon` e `GRANT EXECUTE TO authenticated` |
| **`reports`** | **Compatível** | Preserva colunas e policies existentes, estende `reports_one_target` para 5 alvos, adiciona `reports_dedupe_research`, concede `GRANT INSERT (research_id)` e bloqueia enumeração em `reports_insert` |
| **`notifications`** | **Compatível** | Adiciona `research_id` (`ON DELETE SET NULL`), insere via `SECURITY DEFINER` preservando policies/grants existentes |
| **`audit_logs`** | **Compatível** | Invoca `public.write_audit_log(text, 'research', uuid, jsonb)` preservando estratégia 100% append-only |
