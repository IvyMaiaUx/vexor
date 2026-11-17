# CSV-EXPORT — ETAPA 5

## 1. Fluxo de Exportação Filtrada

Arquivo: `src/features/admin/utils/audit-export.ts` (`generateAuditLogsCsv`, `exportAuditLogsToCsv`).

- Ao clicar em **Exportar CSV**, `AdminAuditPage` consulta `adminDataProvider.audit.exportFilteredEntries(buildFilters())` para obter todos os registros correspondentes aos filtros ativos (sem limite da página atual).
- Se não houver registros filtrados, exibe aviso informativo sem gerar download vazio.
- Inclui cabeçalhos traduzidos, codificação UTF-8 com BOM (`\uFEFF`) para acentos no Excel, data/hora ISO UTC e nome de arquivo datado (`vexor-demo-audit-YYYY-MM-DD.csv`).
- Todos os metadados passam por `sanitizeAuditMetadata()` antes da serialização.
- O arquivo exportado refere-se exclusivamente aos dados demonstrativos em memória (não representa exportação oficial do Supabase).
