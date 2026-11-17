# VEXOR — Etapa 9.7 (Fase 2B.2) — Integração com o Painel Administrativo

**Data:** 2026-11-16  

---

## 1. Pontos Integrados

1. **Dashboard (`handleGetAdminDashboardStats`):** consulta contagem real de `research_submissions` com `status = 'pending'` (`pendingResearch`). Em ambiente pré-migration (`42P01`), retorna `0` sem derrubar o dashboard; erros reais de permissão/conexão propagam normalmente.
2. **Fila de Moderação (`handleListModerationQueue`):** consulta `research_submissions` e mapeia `domain`, `severity`, `tlp`, `cves`, `attackTechniques`, `rejectionReason` e contagem de denúncias abertas (`reports`).
3. **Execução de Moderação (`handleExecuteModerationAction`):** para `contentType === "research"`, valida `approve`/`reject`/`archive` (exigindo motivo `>= 5` caracteres em `reject`) e invoca `supabase.rpc("moderate_research", { p_research_id, p_decision, p_reason })`.
4. **Ações Disponíveis (`getSupabaseModerationAvailableActions`):** `pending` → `approve/reject/archive`; `approved`/`rejected` → `archive`; `archived` → `[]`.
5. **Mapeamento de Erro `55P03` (`admin-error-mapper.ts`):** `SQLSTATE 55P03` mapeado para HTTP `409` (`state_conflict`).
6. **Gerenciamento de Destinatários TLP (`AdminModerationDetailModal`):** exibe rótulo `TLP`, lista destinatários autorizados e permite conceder/revogar acesso para pesquisas `approved` com `AMBER`, `AMBER+` ou `RED` via `/api/research/[id]/recipients`.
7. **Auditoria (`entity_type = 'research'`):** `admin-server-handlers.ts` já mapeava `entity_type` para `AdminAuditEntry["entityType"]` (que inclui `"research"`).
