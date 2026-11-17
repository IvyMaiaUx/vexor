# EVENT-DETAILS — ETAPA 5

## 1. Componente `AdminAuditDetailModal`

Arquivo: `src/features/admin/components/admin-audit-detail-modal.tsx`

Exibe de forma somente leitura:
- Identificador do evento (`#id`), classificação (`info`, `warning`, `critical`, `access_denied`) e status de integridade (`Íntegro` / `Informação Parcial`).
- Data/hora formatada no idioma ativo (`pt-BR` / `en`).
- Operador (`@actorUsername` e `actorId`) e entidade alvo (`entityType` e `entityId`).
- Usuário afetado (`targetUsername`), descrição (`description`) e justificativa (`reason`), quando presentes.
- Comparação explícita de **Valor Anterior** (`from` / `previousRole`) e **Valor Posterior** (`to` / `newRole`), quando disponíveis (ex.: `user.role_changed`, `system.config_updated`).
- JSON estruturado de metadados após passagem por `sanitizeAuditMetadata()`.
- Suporte a teclado (`Escape` para fechar), `role="dialog"`, `aria-modal="true"` e estados de carregamento/erro.
