# VEXOR — Etapa 9.4: Compatibilidade com Schema, RLS e RPCs

## 1. Operações Permitidas pelo Schema Atual

| Entidade / RPC | Operação | Regras / Grants / Policies |
| --- | --- | --- |
| `public.categories` | `SELECT` | `is_active = true` e `scope in ('forum', 'both')` (`categories_select`) |
| `public.topics` | `SELECT` | `topics_select`: filtrar explicitamente `status = 'published'` na listagem pública |
| `public.topics` | `INSERT` | Grant em `(category_id, title, body)`; `author_id` usa `DEFAULT auth.uid()`; exige `is_active_member()` |
| `public.topics` | `UPDATE` | Grant em `(category_id, title, body)`; `topics_update_owner` exige `author_id = auth.uid()`, `status = 'published'`, `not is_locked`, `is_active_member()` |
| `public.posts` | `SELECT` | `posts_select`: filtrar explicitamente `status = 'published'` |
| `public.posts` | `INSERT` | Grant em `(topic_id, body)`; `author_id` usa `DEFAULT auth.uid()`; trigger `posts_after_insert` atualiza `topics.last_activity_at` |
| `public.posts` | `UPDATE` | Grant em `(body)`; `posts_update_owner` exige `author_id = auth.uid()`, `status = 'published'`, tópico `published` e não bloqueado |
| `public.tags` | `SELECT` / `INSERT` | `SELECT` público; `INSERT (slug, name)` permitido a `is_active_member()` |
| `public.topic_tags` | `SELECT` / `INSERT` / `DELETE` | Autor do tópico (`published` e não bloqueado) ou moderador; trigger limita a 5 tags (`23514`) |
| `public.votes` | `SELECT` / `INSERT` / `DELETE` | `SELECT` próprio (`votes_select_own`); `INSERT (post_id)` apenas em `post.status = 'published'` e `post.author_id IS DISTINCT FROM auth.uid()`; trigger `votes_after_change` atualiza `posts.vote_count` |
| `public.public_profiles` | `SELECT` | View segura (`security_barrier = true`) para `anon` e `authenticated`, omitindo `role` e `is_suspended` |
| `public.set_accepted_post` | `RPC` | `SECURITY DEFINER`, `GRANT EXECUTE TO authenticated`; permite ao autor do tópico (se não bloqueado) ou moderador definir/limpar `accepted_post_id` |

---

## 2. Operações Impedidas ou Limitadas pelas Policies / Schema

1. **Votos em tópicos (`topics`):** A tabela `public.votes` referencia apenas `post_id` (`public.posts`), e `public.topics` não possui coluna `vote_count`. Portanto, **votar diretamente em tópicos e ordenar tópicos por votos do tópico não é suportado pelo schema atual**.
2. **Auto-voto em respostas (`posts`):** `votes_insert` bloqueia `p.author_id = auth.uid()`. O usuário não pode votar na própria resposta.
3. **Campos bilíngues separados:** `topics` possui apenas `title` e `body` (não `title_pt`/`title_en`). Na adaptação para a UI, os campos reais preenchem `title` / `body` mantendo compatibilidade visual com PT-BR e EN.
4. **Role pública do autor:** `public.public_profiles` omite `role` e `is_suspended` por privacidade (`V2`). Badges administrativos em listagens públicas não devem consultar `public.profiles` de terceiros.

---

## 3. Plano de Integração

1. Criar `src/features/forum/forum-service.ts` centralizando todas as leituras e mutações reais no Supabase.
2. Atualizar `src/features/forum/use-forum-store.ts` para eliminar dependência de `INITIAL_TOPICS`, `INITIAL_POSTS` e `localStorage` como fonte real (mantendo assinatura segura com listas vazias para páginas fora do escopo desta etapa, como `/profile` e `/my-contributions`).
3. Conectar `/forum`, `/forum/new`, `/forum/[id]` e a seção de fórum de `/` ao `forum-service.ts`, adicionando suporte a edição própria de tópico e resposta, voto real em posts e RPC `set_accepted_post`.
4. Criar suíte offline com mocks `scripts/test-forum-integration-etapa9-4.mjs` cobrindo os 20 cenários obrigatórios e rodar `tsc`, `eslint`, build e regressões.
