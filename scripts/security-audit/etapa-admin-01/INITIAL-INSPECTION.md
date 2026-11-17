# Inspeção Inicial — Painel Administrativo e Moderação (Etapa 1)

## 1. Estrutura Atual Inspecionada
- **Tipos de banco (`src/types/database.types.ts`):**
  - Enums confirmados: `user_role` (`"member" | "moderator" | "admin"`), `resource_status` (`"pending" | "approved" | "rejected" | "archived"`), `content_status` (`"published" | "hidden" | "deleted"`), `report_status` (`"open" | "reviewing" | "resolved" | "dismissed"`), `report_reason`.
  - Tabelas administrativas/moderação: `profiles`, `resources`, `topics`, `posts`, `reports`, `audit_logs`.
- **Autenticação e `useAuthStore` (`src/features/auth/use-auth-store.ts`, `src/features/auth/validation.ts`):**
  - `UserRole = "member" | "moderator" | "admin"` (sem `root_admin`).
  - `useAuthStore` já expõe `user`, `isActiveMember`, `isModerator`, `isAdmin`, `refreshSession()`, `signOut()`, `syncEpoch`, single-flight e `performConsistentSignOut()`.
  - **Decisão:** nenhuma alteração necessária em `useAuthStore`.
- **Camada admin preexistente (`src/features/admin/` e `src/app/admin/`):**
  - `src/features/admin/types.ts` já possuía `IAdminService`, `AdminStats`, `Report`, `AuditLog`, `UnifiedModerationItem`, porém faltavam os modelos padronizados solicitados (`AdminDashboardStats`, `AdminUser`, `AdminUserFilters`, `AdminUserStatus`, `ModerationQueueItem`, `ModerationAction`, `AdminReport`, `AdminResource`, `AdminAuditEntry`, `PaginationParams`, `PaginatedResult`) e interfaces modulares por domínio.
  - `src/features/admin/services/admin-service.ts` acoplava persistência em `localStorage` e mantinha dados simulados inline, além de ser referenciado diretamente por `src/app/admin/**` e por scripts de regressão (`test-admin-etapa2..6.mjs`, `test-audit-etapa8.mjs`, `test-cybercrime-research-etapa7.mjs`).

## 2. Estratégia Adotada
- Expandir `src/features/admin/types.ts` com todos os modelos e contratos modulares solicitados, preservando compatibilidade retroativa.
- Centralizar os dados simulados em memória em `src/features/admin/data/simulated-admin-data.ts` (sem `localStorage` como banco administrativo e com marcação explícita `isSimulatedDemoData: true`).
- Implementar serviços modulares (`dashboard-service.ts`, `users-service.ts`, `moderation-service.ts`, `reports-service.ts`, `resources-service.ts`, `audit-service.ts` e `admin-provider.ts`) prontos para substituição por `SupabaseAdminProvider` no futuro.
