# ETAPA 3 — DETALHES DO USUÁRIO (`USER-DETAILS.md`)

**Componente:** `src/features/admin/components/admin-user-detail-modal.tsx`

## Comportamento e Dados Exibidos

- Ao selecionar um usuário na tabela/cartão, o modal consulta `adminDataProvider.users.getUserById(userId)` e `adminDataProvider.audit.listAuditEntries({ actorUsername }, { page: 1, pageSize: 3 })`.
- **Estados tratados:**
  - `loading`: indicador de carregamento enquanto consulta o serviço.
  - `notFound`: mensagem explícita quando `getUserById()` retorna `null`.
  - Dados disponíveis: avatar inicial, nome, `@username`, papel, situação, data de cadastro, última atividade demonstrativa, biografia, interesses, links públicos validados (`http:`/`https:`) e eventos administrativos recentes.
- **Privacidade:** nenhum e-mail, senha, token ou dado interno de autenticação é exibido.
- **Ações demonstrativas (Etapa 3):** botões de `Alterar papel` e `Suspender` / `Reativar` preparados visualmente e estritamente desabilitados (`disabled`), com aviso explícito de modo somente visualização e proteção para a conta do administrador atual.
