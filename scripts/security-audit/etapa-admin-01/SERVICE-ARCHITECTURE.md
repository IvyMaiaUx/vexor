# ETAPA 1 — ARQUITETURA DE SERVIÇOS (`SERVICE-ARCHITECTURE.md`)

**Projeto:** VEXOR  
**Escopo:** Serviços modulares em `src/features/admin/services/` e ponto de exportação `src/features/admin/index.ts`

## 1. Contrato Único (`IAdminDataProvider`)

Definido em `src/features/admin/types.ts` e implementado por `createSimulatedAdminProvider()` em `src/features/admin/services/admin-provider.ts`:

- `isSimulated: boolean`
- `dashboard: IAdminDashboardService` (`SimulatedAdminDashboardService` em `dashboard-service.ts`)
- `users: IAdminUsersService` (`SimulatedAdminUsersService` em `users-service.ts`)
- `moderation: IAdminModerationService` (`SimulatedAdminModerationService` em `moderation-service.ts`)
- `reports: IAdminReportsService` (`SimulatedAdminReportsService` em `reports-service.ts`)
- `resources: IAdminResourcesService` (`SimulatedAdminResourcesService` em `resources-service.ts`)
- `audit: IAdminAuditService` (`SimulatedAdminAuditService` em `audit-service.ts`)

## 2. Utilitários Compartilhados (`src/features/admin/services/shared.ts`)

- `DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE` e `paginateItems()` para paginação consistente em todos os serviços de listagem.
- `hasAdminAccess(actor)` e `hasModeratorAccess(actor)` verificando papel (`role`) e ausência de suspensão (`!actor.isSuspended`).

## 3. Barrel Export (`src/features/admin/index.ts`)

Expõe:
- Todos os tipos de `./types`.
- `adminDataProvider` e `createSimulatedAdminProvider` de `./services/admin-provider`.
- `adminService` legado de `./services/admin-service` (mantido para compatibilidade retroativa com as páginas atuais de `src/app/admin/**` e testes das etapas anteriores).
- `hasAdminAccess`, `hasModeratorAccess` e `paginateItems` de `./services/shared`.

## 4. Preparação para Integração Futura com Supabase

Telas futuras do painel administrativo devem consumir exclusivamente os contratos `IAdminDataProvider` / `adminDataProvider`, permitindo substituir `createSimulatedAdminProvider()` por um futuro `createSupabaseAdminProvider()` baseado em RPCs `SECURITY DEFINER`, Server Actions / Route Handlers e RLS sem reescrever a interface.
