# ETAPA 3 — INTERFACE DE GERENCIAMENTO DE USUÁRIOS (`USER-MANAGEMENT-UI.md`)

**Rota:** `/admin/users` (`src/app/admin/users/page.tsx`)

## Estrutura Implementada

1. **Cabeçalho:**
   - Título `Gerenciamento de usuários` / `User Management`, descrição breve, badges `ADMIN ONLY` e `DADOS DEMONSTRATIVOS` / `SIMULATED DATA`, aviso explícito de ambiente simulado em memória e botão de atualização manual.
2. **Indicadores Resumidos (5 cartões):**
   - Total de usuários (`summary.totalUsers`)
   - Usuários ativos (`summary.activeUsers`)
   - Usuários suspensos (`summary.suspendedUsers`)
   - Administradores (`summary.adminUsers`)
   - Moderadores (`summary.moderatorUsers`)
3. **Listagem (Tabela Desktop `md+` / Cartões Mobile `< md`):**
   - Colunas: Usuário (avatar inicial, `displayName`, `@username`, sem exposição de `email`), Papel (`Member`, `Moderator`, `Admin`), Situação (`Ativo` / `Suspenso`), Cadastro (`createdAt`), Atividade (`lastActivityAt` ou `Sem atividade recente`) e Ações (`Detalhes`).
4. **Estados da Interface:**
   - Carregamento (spinner + skeletons nos cartões resumo), dados disponíveis, lista vazia com botão de limpar filtros e banner de erro (`role="alert"`) com botão `Tentar novamente`.
5. **Internacionalização:**
   - Todos os textos traduzidos em `pt-BR` e `en` via `useI18n()` (`dict.adminPanel.usersPage`), mantendo compatibilidade com chaves legadas verificadas em `test-admin-etapa4.mjs`.
