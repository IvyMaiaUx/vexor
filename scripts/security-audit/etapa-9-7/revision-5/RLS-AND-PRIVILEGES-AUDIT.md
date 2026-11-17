# VEXOR — Etapa 9.7 (Revisão 5) — Auditoria de RLS e Privilégios

**Data:** 2026-11-16  
**Artefato auditado:** `scripts/security-audit/etapa-9-7/revision-4/PROPOSED-MIGRATION-REVISION-4.sql`  
**Comparação oficial:** `supabase/migrations/20261110000003_rls_and_grants.sql`

---

## 1. Verificação de Recursão RLS e `public.is_research_author(uuid)`

- **Trecho auditado:** `PROPOSED-MIGRATION-REVISION-4.sql` linhas 116-131, 304-367 e 746-747.
- **Ciclo anterior (`revision-3`):** `research_select` consultava `research_recipients` e `research_recipients_select` consultava `research_submissions`.
- **Estado na `revision-4`:**
  - `research_recipients_select` passa a chamar `(select public.is_research_author(research_id))` (linha 363).
  - `public.is_research_author(p_research_id uuid)` é `SECURITY DEFINER`, `STABLE`, `SET search_path = ''`, qualificando `public.research_submissions`, `public.profiles` e `auth.uid()`.
  - Por ser `SECURITY DEFINER` criada pelo owner da migration, a consulta a `public.research_submissions` dentro dela não reaciona a policy `research_select` — **recursão eliminada**.
- **Oráculo de existência:** a função exige `r.author_id = auth.uid() and not p.is_suspended`. Para qualquer `p_research_id` inexistente, `NULL`, ou de terceiro, retorna `false` uniformemente. Não vaza existência de registros privados.
- **Privilégios:** `REVOKE ALL FROM PUBLIC, anon; GRANT EXECUTE TO authenticated;` (linhas 746-747).

---

## 2. Verificação de Grants, Triggers e Contorno de Proteções

- **Tabelas:**
  - `public.research_submissions`: `REVOKE ALL` baseline; `GRANT SELECT` e `GRANT INSERT/UPDATE` restrito às 16 colunas de conteúdo para `authenticated`; `anon` sem nenhum privilégio; sem `DELETE`.
  - `public.research_recipients`: `REVOKE ALL` baseline; `GRANT SELECT` para `authenticated`; sem `INSERT/UPDATE/DELETE` direto.
- **Trigger `research_protect_fields()` (linhas 149-234):**
  - `INSERT`: força `author_id := auth.uid()`, `status := 'pending'`, e zera `rejection_reason`, `reviewed_by`, `reviewed_at`, `published_at`.
  - `UPDATE`: bloqueia incondicionalmente mudança de `author_id` e `slug` (`42501`); quando `current_user in ('anon', 'authenticated')`, bloqueia também mudança em `status`, `rejection_reason`, `reviewed_by`, `reviewed_at` e `published_at` (`42501`).
  - RPCs `SECURITY DEFINER` executam com `current_user` = owner da migration, não `authenticated`, permitindo atualização legítima apenas por via controlada.

---

## 3. Achados

| ID | Severidade | Trecho | Descrição / Impacto | Recomendação |
|---|---|---|---|---|
| **RLS-01** | `INFORMATIONAL` | Linhas 289-350, 746-747 | `research_submissions` e `is_research_author` restringem acesso exclusivamente a `authenticated`; `anon` não tem `GRANT SELECT` nem para `TLP:CLEAR`, mantendo coerência com o guard `active_member` das 6 rotas atuais. | Manter assim na Fase 2B; só conceder `SELECT` a `anon` em `CLEAR` se houver decisão futura de produto. |
