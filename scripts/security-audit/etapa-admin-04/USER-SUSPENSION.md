# USER-SUSPENSION — ETAPA 4

## 1. Componente `AdminUserSuspensionModal`

Arquivo: `src/features/admin/components/admin-user-suspension-modal.tsx`

Funcionalidades implementadas para suspensão (`!user.isSuspended`):
- Exibe o usuário selecionado, sua situação atual e a advertência sobre a suspensão demonstrativa.
- Solicita justificativa técnica obrigatória com mínimo de 5 caracteres após `trim()`.
- Exibe erro de validação no cliente quando a justificativa tem menos de 5 caracteres.
- Exige confirmação explícita (etapa de revisão exibindo a justificativa informada) antes de chamar `adminDataProvider.users.updateUserSuspension()`.
- Impede submissões duplicadas (`submitGuardRef` + `submitting`).
- Exibe estados de carregamento, sucesso e erro apenas após a resposta do serviço.

## 2. Regras Obrigatórias no Serviço

Validadas em `SimulatedAdminUsersService.updateUserSuspension()` (`src/features/admin/services/users-service.ts`):
1. Somente administradores ativos (`hasAdminAccess(actor)`) podem suspender (`42501`).
2. Auto-suspensão (`actor.id === targetUserId && suspended`) é bloqueada (`42501`).
3. Suspensão do último administrador ativo (`activeAdminsCount <= 1`) é bloqueada (`42501`).
4. Usuário já suspenso (`suspended && target.isSuspended`) é rejeitado (`22023`).
5. Justificativa com menos de 5 caracteres após `trim()` é rejeitada com erro `22023`.
6. Em caso de sucesso, atualiza `isSuspended = true`, `status = "suspended"` e grava evento `user.suspended` com `reason`, `targetUsername`, `actorId`, `actorUsername`, `entityId` e `createdAt`.
