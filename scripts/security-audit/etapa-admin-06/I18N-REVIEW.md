# Revisão de Internacionalização (PT-BR / EN) — Etapa 6

- Namespace `adminPanel.moderationPage` em `src/lib/i18n/dictionaries.ts` atualizado com paridade completa entre `pt-BR` e `en`:
  - Abas (`queueTab`, `reportsTab`), avisos demonstrativos (`demoBadge`, `demoNotice`), contadores (`counterTotal`, `counterPending`, `counterReported`, `counterEscalated`).
  - Filtros (`filterPriority`, `filterAuthor`, `filterReports`, `clearFiltersBtn`), colunas (`updatedCol`, `priorityCol`, `reportsCol`), ações (`hideBtn`, `restoreBtn`, `escalateBtn`, `requestRevisionBtn`).
  - Labels de severidade/prioridade/status/ações, erros (`loadError`, `conflictError`, `unauthorizedError`), privacidade (`reporterProtected`), `detailModal` e `decisionModal`.
- Renderização SSR validada em `pt-BR` e `en` via `scripts/test-admin-etapa6.mjs`.
