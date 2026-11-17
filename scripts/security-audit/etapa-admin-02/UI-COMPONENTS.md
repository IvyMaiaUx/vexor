# ETAPA 2 — COMPONENTES DE INTERFACE (`UI-COMPONENTS.md`)

## Componentes Criados e Atualizados

- `src/app/admin/page.tsx` — página principal do Dashboard conectada a `adminDataProvider` com estados de carregamento, erro (`role="alert"` + botão tentar novamente), dados disponíveis, listas vazias e atualização manual.
- `src/features/admin/components/admin-metrics-grid.tsx` — atualizado para os 6 indicadores principais com ícones SVG inline, suporte completo a `pt-BR`/`en`, skeleton de carregamento e preservação do aviso `noHistoricalTrends`.
- `src/features/admin/components/admin-recent-activity.tsx` — timeline de eventos recentes de auditoria com suporte a `loading`, lista vazia e formatação localizada.
- `src/features/admin/components/admin-moderation-preview.tsx` — prévia somente leitura da fila de moderação sem ações de aprovação/rejeição nesta etapa.
- `src/features/admin/components/admin-reports-preview.tsx` — prévia de denúncias recentes com contador de pendências e omissão da identidade do denunciante.
- `src/features/admin/components/admin-pending-resources-preview.tsx` — prévia de recursos pendentes com link direto para `/admin/catalog`.
