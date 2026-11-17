# AUDIT-HISTORY — ETAPA 4

## 1. Eventos Padronizados

As operações de gestão de usuários registram exclusivamente:
- `user.role_changed` (metadados: `from`, `to`, `targetUsername`, `isSimulatedDemoData: true`)
- `user.suspended` (metadados: `reason`, `targetUsername`, `isSimulatedDemoData: true`)
- `user.unsuspended` (metadados: `targetUsername`, `isSimulatedDemoData: true`)

## 2. Padrão Append-Only e Sanitização

- `appendAudit()` em `src/features/admin/services/admin-provider.ts` adiciona novos eventos com ID incremental e `createdAt` UTC, sanitizando metadados com `sanitizeAuditMetadata()`.
- `SimulatedAdminAuditService.listAuditEntries()` (`src/features/admin/services/audit-service.ts`) aceita filtro opcional `entityId` para consultar eventos de um usuário específico sem alterar ou remover registros anteriores.
- A interface em `src/app/admin/users/page.tsx` e `src/features/admin/components/admin-user-detail-modal.tsx` exibe o histórico em modo somente leitura (sem botões de edição ou exclusão), com traduções PT-BR e EN, data/hora, ator, usuário afetado, transição de papel e justificativa apenas para `user.suspended`.
- Nenhum e-mail, token, senha ou dado privado é exibido.
