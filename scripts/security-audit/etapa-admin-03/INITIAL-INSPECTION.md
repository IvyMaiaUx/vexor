# ETAPA 3 — INSPEÇÃO INICIAL (`INITIAL-INSPECTION.md`)

**Projeto:** VEXOR  
**Data:** 2026-11-15  
**Escopo:** Diagnóstico prévio de `src/app/admin/users/page.tsx`, `users-service.ts`, `admin-user-detail-modal.tsx`, i18n e proteção no servidor

## 1. Diagnóstico Encontrado Antes da Implementação

1. **`src/app/admin/users/page.tsx`:**
   - Consumia o serviço legado `adminService.getUsers()` com persistência em `localStorage`.
   - Exibia `u.email` na tabela e mantinha modais mutáveis (`AdminUserRoleModal` e `AdminUserSuspensionModal`) ligados a `adminService`.
   - Não exibia indicador de moderadores nos resumos, não possuía coluna de última atividade demonstrativa, não tinha botão de atualização manual, filtro por período ou limpeza rápida de filtros, nem seletor de quantidade por página.
2. **`src/features/admin/components/admin-user-detail-modal.tsx`:**
   - Consumia `adminService` legado e não tratava carregamento de consulta individual (`getUserById`) nem estado de usuário inexistente.
3. **Autorização (`src/app/admin/users/layout.tsx` e `src/proxy.ts`):**
   - `src/app/admin/users/layout.tsx` já valida `requireServerAuthorization("admin")` no servidor, e `src/proxy.ts` exige papel `admin` no servidor antes de servir a rota.
4. **Camada da Etapa 1 (`src/features/admin/services/users-service.ts`):**
   - `listUsers()` já suportava `query`, `role`, `status`, `suspendedOnly` e `PaginationParams`, faltando apenas filtro de período (`period`), campo demonstrativo `lastActivityAt` em `AdminUser` e método `getUsersSummary()`.
