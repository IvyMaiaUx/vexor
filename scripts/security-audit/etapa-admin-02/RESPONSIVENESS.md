# ETAPA 2 — RESPONSIVIDADE E ACESSIBILIDADE (`RESPONSIVENESS.md`)

## Estratégia Responsiva

- **Grid de Indicadores (`AdminMetricsGrid`):** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — adapta de 1 coluna em `320px`/`390px`, 2 colunas em `768px` e 3 colunas em `1280px`/`1440px`.
- **Grid de Prévias (`src/app/admin/page.tsx`):** `grid-cols-1 xl:grid-cols-2` — empilhamento vertical até `1280px` e duas colunas em `1280px+`/`1440px`.
- **Prevenção de Overflow Horizontal:** containers com `min-w-0`, `flex-wrap`, `break-words` / `break-all` nos títulos e ações, garantindo adaptação limpa em `320px` e `390px`.
- **Navegação:** `AdminSidebar` mantém menu lateral fixo em `lg+` e drawer acessível (`role="dialog"`, `aria-modal="true"`) em larguras menores.

## Acessibilidade

- Elementos semânticos (`<header>`, `<section aria-label=...>`, `<ol>`, `<ul>`, `<time dateTime=...>`, `role="alert"` no estado de erro).
- Foco visível via `focus-visible:ring-2` em botões e links interativos.
- SVGs decorativos marcados com `aria-hidden="true"`.
