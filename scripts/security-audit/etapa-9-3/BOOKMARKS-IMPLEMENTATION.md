# VEXOR — Etapa 9.3: Implementação de Favoritos (`bookmarks`) e Transição Local

## 1. Persistência Real em `public.bookmarks`

- **`fetchUserBookmarks()`**: autentica via `supabase.auth.getUser()`, lê `bookmarks` do próprio `user.id` e carrega os recursos correspondentes com `status = 'approved'`, preservando a ordem de salvamento.
- **`toggleUserBookmark(resourceId, currentlyBookmarked)`**:
  - Usuário não autenticado recebe erro `unauthenticated` sem simular persistência.
  - `INSERT` envia apenas `{ resource_id }`, confiando no default `auth.uid()` e na policy `bookmarks_insert`.
  - Código `23505` (duplicidade) é tratado de forma idempotente; `useCatalogStore` também mantém trava `inFlightBookmarksRef` por recurso para evitar cliques duplicados concorrentes.
  - `DELETE` filtra por `user_id = auth.uid()` e `resource_id`.
- **`clearUserBookmarks()`**: remove apenas os registros de `bookmarks` com `user_id = auth.uid()`.
- **Falhas:** erros RLS (`42501` para conta suspensa) ou de rede exibem banner de alerta na UI sem corromper a lista atual.

## 2. Estratégia Segura de Transição do `localStorage`

- `cybersec_locale` permanece no `localStorage` por ser preferência visual de idioma.
- `cybersec_bookmarks` e `cybersec_submitted_resources` **não são apagados** imediatamente e **não são exibidos** como dados misturados ao catálogo real.
- Quando um usuário autenticado carrega seus favoritos pela primeira vez (`vexor_bookmarks_migrated_<user.id>` ausente), `migrateLegacyLocalBookmarks()` resolve os slugs de `cybersec_bookmarks` contra recursos `approved` do banco, insere apenas os faltantes e marca a migração como concluída para aquele `user.id` específico.
