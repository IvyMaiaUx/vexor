# ETAPA 3 — PAGINAÇÃO (`PAGINATION.md`)

## Contrato e Comportamento

- Utiliza `PaginationParams` (`{ page, pageSize }`) e `PaginatedResult<AdminUser>` (`items`, `total`, `page`, `pageSize`, `totalPages`, `isSimulatedDemoData`) via `adminDataProvider.users.listUsers()` e `paginateItems()`.
- **Quantidade configurável por página:** seletor com opções `3`, `5` (padrão) e `10`, reiniciando para a página `1` ao alterar.
- **Controles:** indicador `Página X de Y`, botões `Anterior` e `Próxima` desabilitados nos limites (`page <= 1` e `page >= totalPages`).
- **Proteção contra páginas inválidas:** `paginateItems()` limita `page` ao intervalo `[1, totalPages]`.
- **Reset automático:** alterações na pesquisa ou em qualquer filtro retornam a listagem para a página `1`.
