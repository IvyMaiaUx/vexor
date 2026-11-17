# ETAPA 3 — PESQUISA E FILTROS (`SEARCH-AND-FILTERS.md`)

## Recursos Implementados

- **Pesquisa por nome ou username:** campo `type="search"` com debounce de `250ms` para evitar consultas a cada tecla digitada.
- **Filtro por papel (`roleFilter`):** `all`, `member`, `moderator`, `admin`.
- **Filtro por situação (`statusFilter`):** `all`, `active`, `suspended`.
- **Filtro por período de cadastro (`periodFilter`):** `all`, `7d`, `30d`, `90d` (calculado em `SimulatedAdminUsersService.listUsers()` a partir dos timestamps de `createdAt` dos registros demonstrativos).
- **Combinação e limpeza:** todos os filtros operam em conjunto no serviço `adminDataProvider.users.listUsers()`, atualizam a contagem `Exibindo X de Y usuários`, reiniciam `page` para `1` quando alterados e podem ser redefinidos pelo botão `Limpar filtros`.
