# Fila Unificada de Moderação — Etapa 6 (`/admin/moderation`)

## 1. Preexistente vs. Corrigido/Novo

- **Preexistente:** Rota `/admin/moderation` com `Suspense`, suporte a `?type=resource|topic|post|research`, busca textual e paginação de 8 itens.
- **Corrigido/Novo:**
  - Migração do serviço legado (`adminService`) para `adminDataProvider.moderation` (`SimulatedAdminModerationService`).
  - Expansão de `SIMULATED_MODERATION_QUEUE` de 2 para 8 itens demonstrativos cobrindo os 4 tipos (`resource`, `topic`, `post`, `research`), com `updatedAt`, `flagReason`, `reportCount`, `priority`, `incomplete` e `moderationHistory`.
  - Adição de filtros combináveis por **prioridade**, **autor**, **presença de denúncias** (`all`/`yes`/`no`), **categoria**, **situação**, **período** (`24h`, `7d`, `30d`), **tipo** e **busca textual**, além de botão de limpeza de filtros.
  - Cards de resumo (`counterTotal`, `counterPending`, `counterReported`, `counterEscalated`) e estados explícitos de carregamento, erro com tentativa de recarga, fila vazia e sem resultados.
