# INITIAL-INSPECTION — ETAPA 4: Gestão de Usuários e Controle de Acesso

## 1. Como a Etapa 3 implementou a listagem e os detalhes

- **`src/app/admin/users/layout.tsx`**: Protege a rota no servidor via `requireServerAuthorization("admin")`, redirecionando usuários não autenticados para `/login?next=%2Fadmin%2Fusers` e não-administradores para `/admin`.
- **`src/app/admin/users/page.tsx`**: Renderiza dentro de `<AdminGuard requireAdmin={true}>`, consome `adminDataProvider.users.listUsers()` e `adminDataProvider.users.getUsersSummary()`, possui busca com debounce (`250ms`), filtros combinados (`role`, `status`, `period`), seletor de `pageSize` (`3`, `5`, `10`), tabela desktop (`hidden md:block`), cards mobile (`md:hidden`), paginação e estados de carregamento, erro e vazio.
- **`src/features/admin/components/admin-user-detail-modal.tsx`**: Recebe `{ userId, currentAdminId, onClose }`, consulta `adminDataProvider.users.getUserById(userId)` e `adminDataProvider.audit.listAuditEntries(...)`, valida links externos (`http:`/`https:`), omite campos privados/e-mail e exibe ações administrativas desabilitadas (modo somente leitura da Etapa 3).

## 2. Como os serviços administrativos funcionam

- **`src/features/admin/services/admin-provider.ts`**: Exporta `adminDataProvider` (`createSimulatedAdminProvider()`), mantendo estado isolado **exclusivamente em memória** (sem `localStorage` e sem chamadas remotas ao Supabase).
- **`appendAudit`**: Função centralizada em `admin-provider.ts` que gera IDs sequenciais, sanitiza metadados via `sanitizeAuditMetadata()` e insere novos eventos no início do array `auditLogs` (padrão append-only).
- **`src/features/admin/services/users-service.ts`**: Implementa `IAdminUsersService` (`listUsers`, `getUserById`, `getUsersSummary`, `updateUserRole`, `updateUserSuspension`).
  - **Lacunas identificadas para a Etapa 4**:
    - `updateUserRole` registra `user.role_updated` em vez de `user.role_changed` e não inclui `from`/`to` nos metadados.
    - `updateUserRole` não bloqueia o rebaixamento do último administrador ativo nem valida mudança para o mesmo papel.
    - `updateUserSuspension` exige mínimo de 3 caracteres sem código `22023` (Etapa 4 exige mínimo de 5 caracteres e erro compatível com `22023`), não bloqueia suspensão do último administrador ativo e não bloqueia suspensão duplicada / reativação de usuário já ativo.
- **`src/features/admin/services/audit-service.ts`**: Implementa `SimulatedAdminAuditService.listAuditEntries()`, ordenando por `createdAt` decrescente. Adicionar filtro opcional `entityId` permitirá consultar diretamente o histórico de alterações de um usuário específico.

## 3. Como os dados demonstrativos são armazenados

- **`src/features/admin/data/simulated-admin-data.ts`**: Define `IS_SIMULATED_ADMIN_DATA = true`, `SIMULATED_ADMIN_USERS` (8 usuários com `role` estritamente em `"member" | "moderator" | "admin"`, `status`, `isSuspended`, `createdAt`, `lastActivityAt`), além de `SIMULATED_AUDIT_LOGS` (append-only em memória quando clonado por `createSimulatedAdminProvider()`).
- Componentes React não acessam `SIMULATED_ADMIN_USERS` ou `SIMULATED_AUDIT_LOGS` diretamente; todas as leituras e mutações passam por `adminDataProvider`.

## 4. Como o histórico de auditoria é consultado

- Via `adminDataProvider.audit.listAuditEntries(filter, pagination)`.
- Cada entrada (`AdminAuditEntry` / `AuditLog`) contém `id`, `actorId`, `actorUsername`, `action`, `entityType`, `entityId`, `metadata` (sanitizado) e `createdAt`.
- Na Etapa 4, será possível consultar eventos do usuário afetado (`entityType: "profile"`, `entityId: user.id`) e exibir um painel de histórico demonstrativo na página `/admin/users` com traduções PT-BR e EN.

## 5. Componentes existentes e reaproveitamento

- **`AdminUserDetailModal`** (`src/features/admin/components/admin-user-detail-modal.tsx`): Será mantido e atualizado para exibir também o histórico do usuário afetado e permitir acionar os modais de papel/suspensão/reativação quando aplicável.
- **`AdminUserRoleModal`** (`src/features/admin/components/admin-user-role-modal.tsx`) e **`AdminUserSuspensionModal`** (`src/features/admin/components/admin-user-suspension-modal.tsx`): Já existem no repositório como rascunhos legados ligados ao antigo `adminService` (`localStorage`), sem tradução completa em inglês, sem confirmação explícita em duas etapas e sem verificação de último administrador ativo. Serão refatorados para usar exclusivamente `adminDataProvider.users`, i18n completo PT-BR/EN, confirmação explícita, prevenção de duplo envio, acessibilidade por teclado e estados de carregamento/sucesso/erro.

## 6. Testes da Etapa 3 e compatibilidade

- **`scripts/test-admin-users-etapa3.mjs`**: Valida `SimulatedAdminUsersService` (`listUsers`, `getUsersSummary`, `getUserById`), renderização SSR de `AdminUsersPage` e `AdminUserDetailModal` em `pt-BR` e `en`, proteção `requireServerAuthorization("admin")` e dicionários i18n. Todos esses contratos devem permanecer intactos.
- **`scripts/test-admin-etapa4.mjs`**: Será atualizado/ampliado para testar todos os 24 requisitos da Etapa 4 contra a camada real `adminDataProvider` / `SimulatedAdminUsersService` / `SimulatedAdminAuditService` e SSR dos novos modais, mantendo as verificações de integridade do schema SQL e isolamento público.
