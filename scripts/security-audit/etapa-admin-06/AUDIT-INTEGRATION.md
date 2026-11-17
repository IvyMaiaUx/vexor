# Integração Demonstrativa com Auditoria — Etapa 6

## 1. Fluxo Implementado

- Toda ação executada por `SimulatedAdminModerationService.executeAction()` e `SimulatedAdminReportsService.resolveReport()` invoca `this.state.appendAudit(...)` no `createSimulatedAdminProvider()`.
- Cada registro inclui:
  - `actorId` e `actorUsername`
  - `action` (ex.: `resource.approve`, `research.reject`, `report.reviewing`)
  - `entityType` (`resource`, `topic`, `post`, `research`, `report`) e `entityId`
  - `metadata.from` (estado anterior) e `metadata.to` (estado posterior)
  - `metadata.reason` / `metadata.note`
  - `metadata.isSimulatedDemoData: true`
  - `createdAt` (ISO-8601)
- Os metadados passam por `sanitizeAuditMetadata()` em `admin-provider.ts`.
- A interface de moderação é **append-only**: não há controles para editar ou excluir entradas de histórico ou auditoria, e os avisos explicitam que os registros são demonstrativos/locais.
