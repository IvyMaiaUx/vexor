# CRITICAL-EVENTS — ETAPA 5

## 1. Classificação Centralizada (`classifyAuditSeverity`)

Definida em `src/features/admin/utils/audit-export.ts` e compartilhada entre serviço, listagem, modal e exportação CSV:
- **`access_denied`**: ações contendo `denied` ou `unauthorized` (ex.: `auth.access_denied`).
- **`critical`**: `user.role_changed`, `user.role_updated`, `user.suspended`, `system.config_updated`, `topic.delete`, `post.delete`, `resource.rejected` e eventos marcados com `incomplete: true`.
- **`warning`**: `user.unsuspended`, `topic.lock`, `topic.hide`, `post.hide`, `research.rejected`, `research.revision_requested`, `report.reviewing`, `maintenance.cleanup`.
- **`info`**: demais eventos operacionais/informativos (`resource.approved`, `report.resolved`, etc.).

## 2. Escopo Demonstrativo

Os eventos críticos e de acesso negado exibidos pertencem exclusivamente ao conjunto demonstrativo em memória (`SIMULATED_AUDIT_LOGS`), sem instrumentação real de proxy/middleware nem registro de invasões reais.
