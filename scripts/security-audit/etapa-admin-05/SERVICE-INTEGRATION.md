# SERVICE-INTEGRATION — ETAPA 5

## 1. Migração para `adminDataProvider.audit`

`src/app/admin/audit/page.tsx` deixou de usar o legado `adminService.getAuditLogs()` (`localStorage`) e passou a consumir exclusivamente `adminDataProvider.audit`:
- `listAuditEntries(filters, pagination)`
- `getAuditSummary()`
- `exportFilteredEntries(filters)`
- `getAuditEntryById(id)`

## 2. Isolamento de Dados

- Nenhum componente em `src/app/admin/audit/` ou `src/features/admin/components/admin-audit-detail-modal.tsx` acessa `SIMULATED_AUDIT_LOGS` diretamente.
- Nenhuma persistência em `localStorage` ou escrita remota no Supabase foi adicionada.
