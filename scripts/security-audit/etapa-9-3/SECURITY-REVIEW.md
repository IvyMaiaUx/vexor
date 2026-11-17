# VEXOR — Etapa 9.3: Revisão de Segurança

## 1. Garantias Aplicadas

- **Identidade autenticada no servidor:** todas as operações de escrita (`bookmarks`, `resources`) obtêm o usuário via `supabase.auth.getUser()`; nenhum `user_id` ou `submitted_by` vem do cliente.
- **Menor privilégio em `INSERT` de recursos:** apenas as 8 colunas com `GRANT INSERT` são enviadas; tentativas de passar `status`, `slug`, `submitted_by` ou `reviewed_*` são rejeitadas.
- **Separação de conteúdo não público:** `queryCatalogResources` filtra `status = 'approved'` para evitar que recursos `pending`/`rejected` de um autor ou moderador apareçam na listagem pública do catálogo, mantendo o RLS como barreira efetiva no PostgreSQL.
- **Prevenção de injeção em busca PostgREST:** `sanitizeIlikeTerm` escapa `%`, `_`, `\` e remove `(`, `)`, `,` antes de compor `.or(...)`.
- **Zero `service_role` e zero alteração de schema/policies/migrations/.env.**

## 2. Limitações Observadas

- A tabela `public.resources` armazena apenas uma coluna `description` (sem tradução separada `description_pt`/`description_en`), portanto o texto exibido nos cards e detalhes reflete o idioma em que o recurso foi cadastrado.
- As validações automatizadas desta etapa utilizam mocks offline do cliente Supabase; a validação em runtime contra o PostgreSQL remoto dependerá de execução autorizada com conta dedicada `member` sem alterar a conta `admin`.
