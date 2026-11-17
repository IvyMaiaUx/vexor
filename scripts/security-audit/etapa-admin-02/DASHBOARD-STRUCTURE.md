# ETAPA 2 — ESTRUTURA DO DASHBOARD (`DASHBOARD-STRUCTURE.md`)

**Rota:** `/admin` (`src/app/admin/page.tsx`)

## Áreas Implementadas

1. **A. Cabeçalho (`<header>`):**
   - Título `Dashboard`, descrição breve, saudação contextual (`user.displayName || user.username`), badge de papel (`ROOT ACCESS` / `MODERADOR`), badge explícita `DADOS DEMONSTRATIVOS` / `SIMULATED DATA`, data atual formatada via `Intl.DateTimeFormat(locale, { dateStyle: "long" })` e botão de atualização manual.
   - Bloco informativo explícito sobre o ambiente com dados simulados em memória.
2. **B. Indicadores Principais (`AdminMetricsGrid`):**
   - 6 cartões com ícone SVG inline, título, valor, descrição curta e link de navegação:
     1. Total de usuários (`/admin/users`)
     2. Usuários ativos (`/admin/users`)
     3. Publicações (`/admin/catalog`)
     4. Denúncias pendentes (`/admin/reports`)
     5. Recursos aguardando aprovação (`/admin/catalog`)
     6. Itens na fila de moderação (`/admin/moderation`)
   - Sem percentuais ou tendências inventadas; exibe aviso explícito de ausência de série histórica (`noHistoricalTrends`).
3. **Alertas Operacionais (`AdminAlerts`):**
   - Mantido para sinalização de prioridades operacionais com base em `AdminDashboardStats`.
4. **D. Prévia da Fila de Moderação (`AdminModerationPreview`):**
   - Lista somente leitura dos itens pendentes (`pending` / `revision_requested`) com tipo de conteúdo, título, data de envio, status e link para `/admin/moderation`.
5. **E. Denúncias Recentes (`AdminReportsPreview`):**
   - Quantidade pendente, categoria (motivo), tipo de conteúdo denunciado, status, título do alvo, data de recebimento e link para `/admin/reports`, omitindo dados do denunciante.
6. **F. Recursos Aguardando Aprovação (`AdminPendingResourcesPreview`):**
   - Nome do recurso, categoria, data de envio, status e link para `/admin/catalog`.
7. **C. Atividade Recente (`AdminRecentActivity`):**
   - Timeline ordenada de eventos administrativos (`entityType`, `action`, descrição/motivo sanitizado, operador e data/hora localizada) com link para `/admin/audit`.
