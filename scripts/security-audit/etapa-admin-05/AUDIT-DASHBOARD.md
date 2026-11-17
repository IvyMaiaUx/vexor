# AUDIT-DASHBOARD — ETAPA 5

## 1. Visão Geral da Central (`/admin/audit`)

Implementada em `src/app/admin/audit/page.tsx` dentro de `<AdminGuard requireAdmin={true}>` e protegida no servidor por `src/app/admin/audit/layout.tsx` (`requireServerAuthorization("admin")`).

## 2. Indicadores Resumidos

Calculados dinamicamente por `adminDataProvider.audit.getAuditSummary()` (`src/features/admin/services/audit-service.ts`):
- `totalEvents`: total de eventos demonstrativos em memória.
- `criticalEvents`: eventos classificados como `critical`.
- `adminChanges`: alterações administrativas (`user.*`, `system.*`, `resource.*`).
- `accessDeniedEvents`: eventos classificados como `access_denied`.
- `recentEvents`: eventos nas últimas 24 horas (relativas ao timestamp mais recente / atual).

Todos os dados são identificados com os selos `ADMIN ONLY`, `APPEND-ONLY` e `DADOS DEMONSTRATIVOS` (`SIMULATED DATA`).
