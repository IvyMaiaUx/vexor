# ETAPA 1 — MODELAGEM DE DADOS (`DATA-MODELS.md`)

**Projeto:** VEXOR  
**Escopo:** Camada de dados e tipos administrativos (`src/features/admin/types.ts`)

## 1. Alinhamento com o Schema PostgreSQL (`src/types/database.types.ts`)

Todos os enums administrativos e de moderação espelham estritamente os enums oficiais do banco:

- `DbUserRole`: `"member" | "moderator" | "admin"` (`user_role` — sem `root_admin`).
- `ResourceStatus`: `"pending" | "approved" | "rejected" | "archived"` (`resource_status`).
- `ContentStatus`: `"published" | "hidden" | "deleted"` (`content_status`).
- `ReportStatus`: `"open" | "reviewing" | "resolved" | "dismissed"` (`report_status`).
- `ReportReason`: `"spam" | "malicious_content" | "personal_data" | "harassment" | "unauthorized_attack" | "copyright" | "other"` (`report_reason`).

## 2. Tipos Padronizados da Etapa 1

Definidos em `src/features/admin/types.ts`:

- `AdminUserStatus`: `"active" | "suspended"`.
- `AdminUser`: espelha `public.profiles` sem expor e-mail privado (`id`, `username`, `displayName`, `bio`, `role`, `isSuspended`, `interests`, `reputationPoints`, `createdAt`, `updatedAt`, `isSimulatedDemoData`).
- `AdminUserFilters`: `role?: DbUserRole | "all"`, `status?: AdminUserStatus | "all"`, `suspendedOnly?: boolean`, `query?: string`.
- `AdminDashboardStats`: métricas agregadas de usuários, recursos, tópicos/posts, pesquisa pendente, denúncias abertas e auditoria, com flag obrigatória `isSimulatedDemoData: boolean`.
- `ModerationQueueItem`: item unificado da fila de moderação (`resource`, `topic`, `post`, `research`).
- `ModerationAction`: `"approve" | "reject" | "archive" | "hide" | "unhide" | "delete" | "pin" | "unpin" | "lock" | "unlock" | "request_revision"`.
- `AdminReport`: alias tipado de `Report`.
- `AdminResource`: modelo administrativo de recurso alinhado a `public.resources` e `ResourceStatus`.
- `AdminAuditEntry`: alias tipado de `AuditLog`.
- `PaginationParams`: `{ page?: number; pageSize?: number }`.
- `PaginatedResult<T>`: `{ items: T[]; total: number; page: number; pageSize: number; totalPages: number; isSimulatedDemoData?: boolean }`.
