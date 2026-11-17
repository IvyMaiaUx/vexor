# FILTERS-AND-SEARCH — ETAPA 5

## 1. Filtros Combináveis na Camada de Serviço

Todos os filtros são executados em `SimulatedAdminAuditService.listAuditEntries()` (`src/features/admin/services/audit-service.ts`):
- **Pesquisa textual (`query`):** busca com debounce (`250ms`) em ID, `actorUsername`, `action`, `entityType`, `entityId` e metadados sanitizados.
- **Operador (`actorUsername`):** filtro por nome demonstrativo do ator com debounce (`250ms`).
- **Ação (`action`):** seleção do tipo de evento (`user.role_changed`, `user.suspended`, `user.unsuspended`, `auth.access_denied`, `system.config_updated`, etc.).
- **Entidade (`entityType`):** `profile`, `resource`, `topic`, `post`, `report`, `research`, `system`.
- **Classificação (`severity`):** `info`, `warning`, `critical`, `access_denied`.
- **Período (`period`):** `all`, `today`, `7d`, `30d`, `90d`, `custom` (com `startDate` e `endDate`).
- **Ordenação (`sortOrder`):** `desc` (mais recentes) ou `asc` (mais antigos).

## 2. Regras de Navegação e Estado

- Alterar qualquer filtro reinicia a página atual (`page = 1`).
- Navegar entre páginas mantém todos os filtros ativos.
- Botão **Limpar filtros** restaura o estado inicial.
- Exibe contagem de resultados, estado de carregamento, estado vazio e banner de erro com botão de nova tentativa.
