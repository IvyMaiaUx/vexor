# Denúncias e Privacidade — Etapa 6

## 1. Preexistente vs. Corrigido/Novo

- **Preexistente:** `SimulatedAdminReportsService` e `AdminReportModal` acoplado ao `adminService` legado, exibindo `@${report.reporterUsername}`.
- **Corrigido/Novo (`reports-service.ts`, `admin-report-modal.tsx`, `admin-moderation-queue.tsx`, `page.tsx`):**
  - Integração da aba **Denúncias** em `/admin/moderation` via `adminDataProvider.reports`.
  - Migração de `AdminReportModal` para `adminDataProvider.reports.resolveReport(...)` com exibição do histórico de decisões da denúncia (`report.history`).
  - Ocultação/mascaramento da identidade privada do denunciante: `SimulatedAdminReportsService.listReports()` retorna `reporterId: null` e `reporterUsername: "protected_reporter"`, e a UI exibe apenas indicador de identidade protegida (`reporterProtected`).
  - Validação de nota mínima de 5 caracteres e bloqueio de transição redundante (`409 Conflict`).
