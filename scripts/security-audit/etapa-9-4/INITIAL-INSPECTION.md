# VEXOR — Etapa 9.4: Inspeção Inicial do Fórum

## 1. Arquivos Inspecionados

- **Migrations e Schema:**
  - `supabase/migrations/20261110000001_schema.sql` (`topics`, `posts`, `tags`, `topic_tags`, `votes`, constraints e índices)
  - `supabase/migrations/20261110000002_functions_triggers.sql` (`on_post_created`, `on_vote_changed`, `topic_tags_limit`, `set_accepted_post`)
  - `supabase/migrations/20261110000003_rls_and_grants.sql` (grants por coluna e policies de `topics`, `posts`, `tags`, `topic_tags`, `votes`)
  - `supabase/migrations/20261113143000_security_hardening.sql` (`set_accepted_post` endurecida com `FOR UPDATE` e `public.public_profiles`)
- **Tipos:**
  - `src/types/database.types.ts` (`topics`, `posts`, `tags`, `topic_tags`, `votes`, `public_profiles`, `set_accepted_post`)
- **Aplicação Atual:**
  - `src/features/forum/types.ts`
  - `src/features/forum/validation.ts`
  - `src/features/forum/use-forum-store.ts`
  - `src/features/forum/seed-topics.ts`
  - `src/features/forum/topic-card.tsx`
  - `src/features/forum/markdown-view.tsx`
  - `src/app/forum/page.tsx`
  - `src/app/forum/new/page.tsx`
  - `src/app/forum/[id]/page.tsx`
  - `src/app/page.tsx`

---

## 2. Diagnóstico Atual

### Funcionalidades existentes na UI
- Listagem de tópicos (`/forum`) com busca textual, filtro por categoria, filtro por tag, abas (`all`, `unanswered`, `solved`, `top`) e paginação via `searchParams`.
- Criação de tópico (`/forum/new`) com preview Markdown, seleção de categoria e até 5 tags.
- Detalhe do tópico (`/forum/[id]`) com renderização Markdown segura (`MarkdownView`), listagem/ordenação de respostas, formulário de resposta, marcação de resposta aceita e botões de voto.
- Prévia do fórum na Home (`src/app/page.tsx`).

### Funcionalidades simuladas / locais atualmente
- `useForumStore` combina `INITIAL_TOPICS` e `INITIAL_POSTS` (`seed-topics.ts`) com `window.localStorage` (`cybersec_forum_user_topics`, `cybersec_forum_user_posts`, `cybersec_forum_user_votes`).
- `src/app/page.tsx` renderiza `FEATURED_TOPICS` estático de `src/config/site.ts`.
- `/forum`, `/forum/new` e `/forum/[id]` leem e gravam apenas em memória/`localStorage`.

### Riscos identificados na versão atual
1. Confiança em dados locais/estáticos sem validação de sessão real ou RLS.
2. Voto em tópico simulado no frontend, embora o schema do PostgreSQL só suporte votos em `posts`.
3. Ausência de fluxo de edição real de tópicos e respostas próprias.
4. Necessidade de consultar `public.public_profiles` (e nunca `public.profiles`) para exibir autores sem violar privacidade ou falhar para `anon`.
