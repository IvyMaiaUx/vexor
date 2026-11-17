# VEXOR — Etapa 9.7 (Fase 1) — Autorização, RLS e Arquitetura de Integração

**Data:** 2026-11-15  

---

## 1. Políticas de Autorização, Grants e RLS Propostas

Seguindo o padrão estrito da Migration 03 (`20261110000003_rls_and_grants.sql`):

### 1.1 Grants de Coluna (Menor Privilégio)
- `anon`: **nenhum acesso** (`REVOKE ALL`) — Cybercrime Research não é público.
- `authenticated`:
  - `SELECT` na tabela `public.research_submissions`.
  - `INSERT` **apenas** nas colunas editáveis pelo autor: `(title_pt, title_en, summary_pt, summary_en, body_pt, body_en, domain, category_slug, severity, tlp, cves, attack_techniques, source_references, confidence_level, methodology, read_time_minutes)`.
  - Colunas protegidas (`id`, `slug`, `author_id`, `status`, `rejection_reason`, `reviewed_by`, `reviewed_at`, `published_at`, `created_at`, `updated_at`) **nunca** recebem `INSERT`/`UPDATE` direto do cliente.
  - `UPDATE` permitido apenas ao autor enquanto `status = 'pending'` ou via RPC `resubmit_research(uuid)` quando `status = 'rejected'`.
  - `DELETE` bloqueado para clientes (preservação histórica e moderação via `status = 'archived'`).

### 1.2 Policies RLS Propostas
1. **`research_select`**:
   - Visível apenas para `is_active_member()` quando `status = 'approved'`, OU para o próprio autor (`author_id = (select auth.uid())` e `is_active_member()`), OU para `is_moderator()`.
   - Visitantes `anon` e contas suspensas (`!is_active_member()`) não enxergam nenhuma linha.
2. **`research_insert`**:
   - `WITH CHECK (is_active_member() AND author_id = (select auth.uid()) AND status = 'pending')`.
3. **`research_update_own_pending`**:
   - `USING (is_active_member() AND author_id = (select auth.uid()) AND status = 'pending')` com `WITH CHECK (author_id = (select auth.uid()) AND status = 'pending')`.

### 1.3 RPCs `SECURITY DEFINER` Propostas
1. **`moderate_research(p_research_id uuid, p_decision public.resource_status, p_reason text DEFAULT NULL)`**:
   - Exige `is_moderator()`.
   - Aceita `'approved' | 'rejected' | 'archived'`.
   - Exige justificativa (`>= 5` chars) em `'rejected'`.
   - Atualiza `status`, `reviewed_by = auth.uid()`, `reviewed_at = now()`, `published_at` (quando `'approved'`), `rejection_reason`.
   - Grava auditoria via `write_audit_log('research.' || p_decision, 'research', p_research_id, ...)` e notifica o autor em `public.notifications`.
2. **`resubmit_research(p_research_id uuid)`**:
   - Exige `is_active_member()` e que `author_id = auth.uid()` e `status = 'rejected'`.
   - Redefine `status = 'pending'`, limpa `rejection_reason` e registra evento em `audit_logs`.

---

## 2. Arquitetura de Integração na Aplicação

Seguindo os padrões das Etapas 9.3, 9.4, 9.5 e 9.6:

1. **Camada Server-Side / Route Handlers:**
   - `src/app/api/research/route.ts` (`GET` paginado com filtros, `POST` submissão autenticada).
   - `src/app/api/research/[id]/route.ts` (`GET` detalhe, `PATCH` edição de rascunho/pendente ou reenvio).
   - Todos os handlers validam sessão com `requireServerAuthorization("active_member")` e usam `createClient()` (`@/lib/supabase/server`), sem `service_role`.
2. **Integração no Painel Administrativo (`/admin/moderation`):**
   - Atualizar `admin-server-handlers.ts` para incluir `research_submissions` na fila unificada e acionar `supabase.rpc("moderate_research", ...)` quando `contentType === "research"`, além de contar `pendingResearch` real no Dashboard.
3. **Serviço Cliente e UI:**
   - Refatorar `src/features/cybercrime-research/services/research-service.ts` para consumir `/api/research/**` (async), mantendo `isDemonstrative` explícito apenas nos seeds editoriais estáticos (`CASE_STUDIES`, `ANALYSIS_LAB_GUIDES`) caso sejam mantidos separados como material editorial curado, ou removendo o uso de `localStorage` (`vexor_admin_research_queue`) completamente.
   - Estados explícitos de carregamento, lista vazia, erro de rede/autorização e validação PT-BR/EN em todos os modais e páginas.
