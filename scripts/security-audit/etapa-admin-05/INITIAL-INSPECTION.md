# INITIAL-INSPECTION — ETAPA 5: Logs de Auditoria e Segurança (`/admin/audit`)

## 1. Como `listAuditEntries()` funciona atualmente

- Implementado em `src/features/admin/services/audit-service.ts` (`SimulatedAdminAuditService`), exposto via `adminDataProvider.audit`.
- Atualmente aceita filtros `entityType`, `entityId`, `action`, `actorUsername`, `startDate`, `endDate` e `pagination` (`page`, `pageSize`).
- Ordena por `createdAt` decrescente e pagina com `paginateItems()`.
- **Lacunas para a Etapa 5:** falta suporte a pesquisa textual (`query`), filtro por classificação (`info`, `warning`, `critical`, `access_denied`), filtro por período (`today`, `7d`, `30d`, `90d`, `custom`), ordenação (`desc`/`asc`), consulta individual (`getAuditEntryById`), resumo de indicadores (`getAuditSummary`) e recuperação completa filtrada para exportação CSV.

## 2. Campos de `AdminAuditEntry` (`AuditLog`)

Definido em `src/features/admin/types.ts`:
- `id: number`
- `actorId: string | null`
- `actorUsername: string`
- `action: string`
- `entityType: "profile" | "resource" | "topic" | "post" | "report" | "research" | "system"`
- `entityId: string`
- `metadata: Record<string, unknown>`
- `createdAt: string`
- `incomplete?: boolean`

## 3. Como os eventos demonstrativos são criados

- Em `src/features/admin/data/simulated-admin-data.ts` (`SIMULATED_AUDIT_LOGS`) e em runtime via `appendAudit()` em `src/features/admin/services/admin-provider.ts` (padrão append-only em memória, sem `localStorage`).
- `appendAudit()` sanitiza metadados com `sanitizeAuditMetadata()` antes de inserir no início de `auditLogs`.

## 4. Como a paginação e os serviços administrativos são acessados

- Paginação centralizada em `paginateItems()` (`src/features/admin/services/shared.ts`), retornando `PaginatedResult<T>`.
- Os serviços devem ser acessados exclusivamente via `adminDataProvider` (`src/features/admin/services/admin-provider.ts`).
- **Lacuna encontrada:** `src/app/admin/audit/page.tsx` ainda consumia o legado `adminService.getAuditLogs()` (`localStorage`) e filtrava no cliente. Será migrado para `adminDataProvider.audit`.

## 5. Autorização server-side

- `src/app/admin/audit/layout.tsx` já aplica `requireServerAuthorization("admin")` (`force-dynamic`), redirecionando não autenticados para `/login?next=%2Fadmin%2Faudit` e `member`/`moderator` para `/admin`.
- Será preservado integralmente, junto com `<AdminGuard requireAdmin={true}>` na página.

## 6. Informações privadas e sanitização / exportação CSV

- `src/features/admin/utils/audit-export.ts` já possui `sanitizeAuditMetadata()`, `escapeCsvCell()`, `generateAuditLogsCsv()` e `exportAuditLogsToCsv()`.
- **Lacunas de segurança identificadas:**
  - `escapeCsvCell()` verifica `/^[=+\-@\t\r]/`, mas não neutraliza `\n` nem payloads precedidos por espaços ou caracteres de controle (ex.: `" =cmd"`, `"\u0000=1+1"`).
  - `SENSITIVE_KEY_REGEX` deve incluir também `email`, `service_role`, `refresh_token`, `access_token`, `session` e tratar metadados malformados com segurança.
- `AdminAuditDetailModal` (`src/features/admin/components/admin-audit-detail-modal.tsx`) já existe, mas precisa de suporte a comparação `from`/`to`, exibição de justificativa e descrição, badge de classificação, acessibilidade por teclado (`Escape`) e tradução completa PT-BR/EN.
