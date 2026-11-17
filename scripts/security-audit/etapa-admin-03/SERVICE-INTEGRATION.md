# ETAPA 3 — INTEGRAÇÃO DE SERVIÇOS (`SERVICE-INTEGRATION.md`)

## Contratos e Provedor

- `src/app/admin/users/page.tsx` e `src/features/admin/components/admin-user-detail-modal.tsx` consomem exclusivamente `adminDataProvider` (`src/features/admin/services/admin-provider.ts`).
- Ampliações realizadas na camada da Etapa 1:
  - `AdminUser.lastActivityAt?: string` e `AdminUserFilters.period?: "all" | "7d" | "30d" | "90d"` em `src/features/admin/types.ts`.
  - `AdminUsersSummary` e `IAdminUsersService.getUsersSummary()` em `src/features/admin/types.ts` e `src/features/admin/services/users-service.ts`.
  - Filtro de período em `SimulatedAdminUsersService.listUsers()`.
  - Timestamps demonstrativos `lastActivityAt` e registros demonstrativos adicionais em `SIMULATED_ADMIN_USERS` (`src/features/admin/data/simulated-admin-data.ts`).
- Nenhuma importação direta de `simulated-admin-data.ts` nos componentes de UI, nenhum uso de `localStorage` e nenhuma escrita no Supabase.
