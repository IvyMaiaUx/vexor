# ETAPA 3 — RESPONSIVIDADE E ACESSIBILIDADE (`RESPONSIVENESS.md`)

## Adaptação Responsiva

- **Indicadores Resumidos:** `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` (adapta de 2 colunas em `320px`/`390px` até 5 colunas em `1280px`/`1440px`).
- **Barra de Pesquisa e Filtros:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5` com `min-w-0` e `flex-wrap` nos controles de contagem, tamanho de página e limpeza de filtros.
- **Listagem:** tabela completa em `md+` (`hidden md:block`) e lista em cartões em telas menores (`md:hidden`) para evitar rolagem horizontal em `320px` e `390px`.

## Acessibilidade

- `<header>`, `<section aria-label=...>`, `<label htmlFor=...>`, `<table scope="col">`, `<time dateTime=...>`, `role="alert"` no erro e `role="dialog"` + `aria-modal="true"` + fechamento por `Escape` no modal de detalhes.
- Foco visível com `focus-visible:ring-2` em inputs, selects, botões e links.
