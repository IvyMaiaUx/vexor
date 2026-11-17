# I18N-REVIEW — ETAPA 5

## 1. Cobertura Completa `pt-BR` e `en`

`src/lib/i18n/dictionaries.ts` foi atualizado em `Dictionary`, `pt-BR` e `en` dentro de `adminPanel.auditPage`, cobrindo:
- Cabeçalho, selos demonstrativos, descrição, avisos de imutabilidade e botões de atualização/exportação.
- 5 indicadores de resumo (`totalEvents`, `criticalEvents`, `adminChanges`, `accessDenied`, `recentEvents`).
- Todos os filtros (busca, operador, ação, entidade, classificação, período incluindo `90d` e intervalo personalizado, ordenação, limpar filtros, paginação e `pageSize`).
- Classificações (`info`, `warning`, `critical`, `access_denied`), nomes de ações e tipos de entidade.
- Modal de detalhes (`AdminAuditDetailModal`) com comparação `Valor Anterior` / `Valor Posterior`, justificativa, descrição e JSON sanitizado.
- Mensagens de exportação CSV, estado vazio e estado de erro.
