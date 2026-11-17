# USER-REACTIVATION — ETAPA 4

## 1. Fluxo de Reativação

Implementado no componente `AdminUserSuspensionModal` (`src/features/admin/components/admin-user-suspension-modal.tsx`) quando `user.isSuspended === true`, acionado a partir da tabela desktop, dos cards mobile ou do `AdminUserDetailModal`.

## 2. Regras Obrigatórias

Validadas em `SimulatedAdminUsersService.updateUserSuspension()` (`src/features/admin/services/users-service.ts`) com `suspended = false`:
1. Somente administradores ativos (`hasAdminAccess(actor)`) podem reativar (`42501`).
2. Não permite reativar um usuário que já esteja ativo (`!suspended && !target.isSuspended` -> `22023`).
3. Exige confirmação explícita na interface antes de chamar o serviço.
4. Previne submissões duplicadas via `submitGuardRef` e estado `submitting`.
5. Atualiza `isSuspended = false`, `status = "active"` em memória e registra o evento `user.unsuspended` com `targetUsername`, `actorId`, `actorUsername`, `entityId` e `createdAt` (sem incluir justificativa de suspensão).
