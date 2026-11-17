# VEXOR — Etapa 9.7 (Fase 2B.2) — Relatório de Implementação

**Data:** 2026-11-16  
**Escopo:** Integração real do módulo Cybercrime Research com PostgreSQL/Supabase (camada de repositório, Route Handlers, serviço cliente, painel administrativo, denúncias, notificações e frontend), sem alterações em `database.types.ts` e sem aplicação de migrations no banco remoto.

---

## 1. Arquivos Criados e Modificados

### Criados
- `src/features/cybercrime-research/server/research-repository.ts` — Repositório Supabase por requisição (`createSupabaseResearchRepository`), tipos locais de linha (`ResearchSubmissionRow`, `ResearchRecipientRow`) alinhados à migration `20261116114600_research_submissions.sql` (sem modificar `database.types.ts`) e mapeamento seguro de erros PostgreSQL (`mapResearchPgError`, incluindo `55P03` → `409 Conflict`).
- `src/app/api/research/[id]/resubmit/route.ts` — `POST /api/research/[id]/resubmit` invocando a RPC `resubmit_research`.
- `src/app/api/research/[id]/recipients/route.ts` — `POST /api/research/[id]/recipients` invocando `grant_research_recipient`.
- `src/app/api/research/[id]/recipients/[userId]/route.ts` — `DELETE /api/research/[id]/recipients/[userId]` invocando `revoke_research_recipient`.
- `src/app/api/research/categories/route.ts` — `GET /api/research/categories` listando categorias ativas com escopo `research` ou `both`.
- `scripts/test-research-integration-etapa9-7-2b2.mjs` — Suíte de 11 cenários de integração backend, admin, TLP, `55P03`, denúncias, notificações e verificações estáticas.

### Modificados
- `src/features/cybercrime-research/server/research-server-handlers.ts` — Removido `mock-research-adapter`; handlers conectados a `createSupabaseResearchRepository(supabase)` com `requireServerAuthorization("active_member" | "moderator")`.
- `src/features/cybercrime-research/services/research-service.ts` — Adicionados `listResearchCategories()`, `grantRecipient()`, `revokeRecipient()`, `resubmitRejectedSubmission()` via `POST /api/research/[id]/resubmit`, mantendo conteúdo editorial estático separado das submissões reais e sem fallback silencioso.
- `src/features/cybercrime-research/components/research-submit-modal.tsx` — Seleção de categorias reais via `/api/research/categories`, suporte aos 8 domínios, 5 níveis TLP (`CLEAR`, `GREEN`, `AMBER`, `AMBER+`, `RED`), `bodyPt` e modo de edição/reenvio.
- `src/app/cybercrime-research/library/page.tsx` — Listagem de submissões reais via `researchService.listSubmissions(...)`, filtro TLP, estados de carregamento/vazio/erro, modal de detalhes (`GET /api/research/[id]`) e botão de denúncia (`ReportButton` com `targetType="research"`).
- `src/app/my-contributions/page.tsx` — Listagem de submissões próprias via `researchService.listSubmissions({ scope: "mine" })` e edição/reenvio via `ResearchSubmitModal`.
- `src/features/admin/utils/admin-error-mapper.ts` — Mapeamento de `SQLSTATE 55P03` para HTTP `409` (`state_conflict`).
- `src/features/admin/server/admin-server-handlers.ts` — Contagem de `pendingResearch` no dashboard (com fallback `0` apenas se `42P01` pré-migration), listagem de `research_submissions` na fila de moderação e execução de `approve`/`reject`/`archive` via `moderate_research` RPC.
- `src/features/admin/data/supabase-admin-provider.ts` — Ações permitidas para `research` alinhadas à matriz oficial (`pending -> approve/reject/archive`, `approved/rejected -> archive`, `archived -> []`).
- `src/features/admin/components/admin-moderation-detail-modal.tsx` — Exibição de TLP e gerenciamento de destinatários (`grantRecipient` / `revokeRecipient`) na moderação.
- `src/features/reports/report-service.ts` — Suporte a `targetType = "research"` (`research_id`).
- `src/features/notifications/notification-service.ts` e `src/features/notifications/notification-bell.tsx` — Suporte a `research_approved`, `research_rejected` e rota interna `/cybercrime-research/library?research=...`.
- `scripts/test-admin-supabase-etapa9-6.mjs` — Cenário 18 atualizado para refletir o suporte oficial de `moderate_research` (mantendo `400` para `request_revision`/`escalate`).

---

## 2. Diferença Documentada em Relação a `src/types/database.types.ts`

Como a migration `20261116114600_research_submissions.sql` ainda não foi aplicada ao banco remoto, `src/types/database.types.ts` **não foi alterado nem regenerado**. Os contratos de tabela e enum (`ResearchSubmissionRow`, `ResearchRecipientRow`, `research_approved`, `research_rejected`) foram definidos localmente em `research-repository.ts` e `notification-service.ts` em conformidade exata com a migration oficial.
