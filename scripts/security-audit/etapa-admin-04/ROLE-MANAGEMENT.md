# ROLE-MANAGEMENT — ETAPA 4

## 1. Papéis Suportados

A gestão de papéis utiliza estritamente os três valores do ENUM `public.user_role`:
- `member`
- `moderator`
- `admin`

Nenhum papel adicional foi criado e nenhuma migration SQL foi alterada.

## 2. Componente `AdminUserRoleModal`

Arquivo: `src/features/admin/components/admin-user-role-modal.tsx`

Funcionalidades implementadas:
- Exibe o usuário selecionado (`displayName` e `@username`) e o papel atual.
- Permite selecionar `member`, `moderator` ou `admin`, bloqueando a seleção do papel atual.
- Exibe o papel de destino antes e durante a etapa de confirmação explícita.
- Requer confirmação explícita em duas etapas antes de chamar `adminDataProvider.users.updateUserRole()`.
- Previne submissões duplicadas (`submitGuardRef` + estado `submitting`).
- Exibe estado de carregamento durante a chamada e apresenta mensagem de sucesso ou erro somente após a resposta do serviço.
- Suporta fechamento por teclado (`Escape`) e foco visível (`focus-visible:ring-2`).

## 3. Regras de Negócio e Autorização no Serviço

Validadas em `SimulatedAdminUsersService.updateUserRole()` (`src/features/admin/services/users-service.ts`):
1. Somente administradores ativos (`hasAdminAccess(actor)`) podem alterar papéis; tentativas de `moderator` ou conta suspensa retornam erro `42501`.
2. Auto-rebaixamento (`actor.id === targetUserId && newRole !== "admin"`) retorna erro `42501`.
3. Rebaixar o último administrador ativo (`activeAdminsCount <= 1`) retorna erro `42501`.
4. Papel inválido ou igual ao atual retorna erro `22023`.
5. Usuário inexistente retorna erro `P0002`.
6. Em caso de sucesso, atualiza o papel em memória e registra evento `user.role_changed` com `from`, `to`, `targetUsername`, `actorId`, `actorUsername`, `entityId` e `createdAt`.
