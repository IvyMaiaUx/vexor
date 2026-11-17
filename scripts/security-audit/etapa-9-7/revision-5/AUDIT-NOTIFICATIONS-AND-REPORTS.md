# VEXOR — Etapa 9.7 (Revisão 5) — Auditoria de Auditoria, Notificações e Reports

**Data:** 2026-11-16  
**Artefato auditado:** `scripts/security-audit/etapa-9-7/revision-4/PROPOSED-MIGRATION-REVISION-4.sql`  
**Migrations oficiais comparadas:** `20261110000001_schema.sql`, `20261110000002_functions_triggers.sql`, `20261110000003_rls_and_grants.sql`, `20261113143000_security_hardening.sql`.

---

## 1. Auditoria (`write_audit_log`) e Notificações (`notifications`)

- **Assinatura oficial:** `public.write_audit_log(p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb default '{}'::jsonb)`.
- **Eventos da proposta:** `'research.approved'`, `'research.rejected'`, `'research.archived'`, `'research.resubmitted'`, `'research.recipient_granted'`, `'research.recipient_updated'`, `'research.recipient_revoked'` — todos passando `(text, 'research', p_research_id, jsonb)`.
- **Atomicidade:** todas as chamadas rodam dentro da transação da RPC sem `EXCEPTION` handler que suprima erros; falhas provocam rollback completo.
- **Notificações:** `moderate_research` só insere em `public.notifications` quando `p_decision in ('approved', 'rejected')`, `v_author_id is not null`, `v_author_id <> auth.uid()` e `not p.is_suspended` (linhas 449-467). Autores excluídos ou suspensos são tratados sem erro e sem ruído.

---

## 2. Denúncias (`public.reports`) e Compatibilidade

- **Coluna e FK:** `research_id uuid references public.research_submissions (id) on delete restrict` (linha 250), preservando histórico.
- **Constraint e índices:** `reports_one_target` estendida para os 5 alvos (`num_nonnulls(..., research_id) = 1`, linha 257); `reports_dedupe_research` (linhas 259-261) segue exatamente o padrão de `reports_dedupe_topic`/`post`/`resource`/`profile`.
- **Grants:** `grant insert (research_id) on public.reports to authenticated;` (linha 267) preserva as 6 colunas originais (`topic_id, post_id, resource_id, profile_id, reason, details`).
- **Policy `reports_insert` (linhas 269-283):** preserva `reporter_id = (select auth.uid())`, `(select public.is_active_member())` e `status = 'open'`, e acrescenta `(research_id is null or exists (select 1 from public.research_submissions r where r.id = reports.research_id))`, bloqueando enumeração de pesquisas privadas/inexistentes via `42501`.

---

## 3. Achados

| ID | Severidade | Trecho | Descrição / Impacto | Recomendação |
|---|---|---|---|---|
| **AUD-01** | `INFORMATIONAL` | `PROPOSED-MIGRATION-REVISION-4.sql:285-286` | `notifications.research_id` usa `ON DELETE SET NULL`, enquanto `reports.research_id` usa `ON DELETE RESTRICT` e `research_recipients` usa `ON DELETE CASCADE`. | Coerente: `reports` impede exclusão física quando há denúncia; `notifications` preserva histórico caso ocorra limpeza administrativa excepcional. |
