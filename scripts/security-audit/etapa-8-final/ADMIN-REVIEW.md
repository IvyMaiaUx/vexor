# Auditoria do Painel Administrativo — Etapa 8

## 1. Integração entre Módulos

- **Dashboard (`/admin`):** Integrado a `adminDataProvider.dashboard`.
- **Usuários (`/admin/users`):** Integrado a `adminDataProvider.users` com proteção contra rebaixamento/suspensão do próprio admin ou do último admin ativo.
- **Auditoria (`/admin/audit`):** Integrada a `adminDataProvider.audit`, somente leitura, exportação CSV protegida contra CSV Formula Injection.
- **Moderação (`/admin/moderation`):** Integrada a `adminDataProvider.moderation` e `adminDataProvider.reports`, com fila unificada (4 tipos), ações compatíveis por estado, conflitos `409`, histórico append-only e inspeção defensiva de URLs.
- **Denúncias (`/admin/reports`):** Corrigido nesta auditoria para migrar de `adminService` legado para `adminDataProvider.reports`, adicionar `<AdminGuard>` e ocultar `reporterUsername` na UI.
- **Sidebar (`AdminSidebar`):** Corrigida nesta auditoria para migrar de `adminService.getStats()` para `adminDataProvider.dashboard.getDashboardStats()`.
- **Dependência legada remanescente:** `src/features/admin/components/admin-moderation-queue.tsx` e `src/features/admin/services/admin-service.ts` permanecem apenas como código legado (não utilizados pelas páginas principais `/admin`, `/admin/users`, `/admin/audit`, `/admin/moderation` e `/admin/reports`).
