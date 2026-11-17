# ETAPA 2 — INTEGRAÇÃO DE DADOS (`DATA-INTEGRATION.md`)

## Contrato e Provedor Utilizados

- Todos os dados do Dashboard são obtidos exclusivamente via `adminDataProvider` (`src/features/admin/services/admin-provider.ts`), criado na Etapa 1:
  - `adminDataProvider.dashboard.getDashboardStats()`
  - `adminDataProvider.audit.listAuditEntries({}, { page: 1, pageSize: 5 })`
  - `adminDataProvider.moderation.listQueue({}, { page: 1, pageSize: 20 })`
  - `adminDataProvider.reports.listReports({}, { page: 1, pageSize: 20 })`
  - `adminDataProvider.resources.listResources({ status: "pending" }, { page: 1, pageSize: 5 })`
- Ampliação consistente do contrato da Etapa 1:
  - `AdminDashboardStats` (`src/features/admin/types.ts`) e `SimulatedAdminDashboardService` (`src/features/admin/services/dashboard-service.ts`) passaram a calcular `totalPublications` (`publishedResources + totalTopics + totalPosts`) e `pendingModerationItems` (`status === "pending" || status === "revision_requested"`).
- Nenhuma importação direta de `simulated-admin-data.ts` nos componentes de UI, nenhum uso de `localStorage` e nenhuma escrita no Supabase.
