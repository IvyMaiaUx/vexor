# Auditoria de Estados Vazios (Empty States) — VEXOR

## 1. Estados Vazios Verificados (PT-BR e EN)

| Área / Rota | Condição | Comportamento / Mensagem | Localização |
| :--- | :--- | :--- | :--- |
| `/forum` (sem filtros ativos) | `topics.length === 0` e `!hasActiveFilters` | PT-BR: `"Ainda não existem discussões nesta categoria. Seja o primeiro a compartilhar conhecimento com a comunidade."` / EN: equivalente em inglês + CTA para criar tópico (`/forum/new`) | `src/app/forum/page.tsx` (linhas 385–390) |
| `/forum` (com filtros ativos) | `topics.length === 0` e `hasActiveFilters` | Exibe `dict.forumPage.noTopicsFound` + botão para limpar filtros | `src/app/forum/page.tsx` |
| `/forum/[id]` (respostas) | Nenhuma resposta no tópico | Exibe `dict.topicDetailPage.noRepliesYet` (`"Este tópico ainda não possui respostas. Seja o primeiro a compartilhar uma análise ou solução técnica!"` e equivalente EN) | `src/lib/i18n/dictionaries.ts` |
| Notificações (`NotificationBell`) | `items.length === 0` | PT-BR: `"Nenhuma notificação no momento."` / EN: `"No notifications yet."` | `src/features/notifications/notification-bell.tsx` (linhas 246–251) |
| Perfil — Aba Tópicos | `topics.length === 0` | Exibe `dict.profilePage.emptyStates.topics` | `src/features/profile/profile-tabs.tsx` (linhas 313–316) |
| Perfil — Aba Respostas | `replies.length === 0` | Exibe `dict.profilePage.emptyStates.replies` | `src/features/profile/profile-tabs.tsx` (linhas 379–382) |
| Perfil — Atividades Recentes | `localStorage` vazio | `EMPTY_ACTIVITIES` (`[]`) — nenhuma atividade simulada de fórum é inventada | `src/features/activity/use-activity-store.ts` |

## 2. Conclusão
Todos os fluxos do fórum, notificações e abas de atividade do perfil exibem estados vazios limpos, sem dados fictícios ou placeholders enganosos.
