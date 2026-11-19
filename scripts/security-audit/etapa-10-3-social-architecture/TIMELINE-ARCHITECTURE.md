# VEXOR — Etapa 10.3: Arquitetura da Timeline Social

## 1. Decisão Arquitetural: Reaproveitamento vs. Nova Tabela
**Recomendação:** **Reaproveitar `topics`, `posts`, `votes`, `categories`, `tags` e `topic_tags`**, sem criar uma tabela paralela de "timeline_posts", adicionando apenas extensões mínimas em `topics` e suporte a UPs no tópico principal.

### Justificativa
- `public.topics` já possui `author_id`, `category_id`, `title`, `body`, `status` (`published` / `hidden` / `deleted`), `is_pinned`, `is_locked`, `accepted_post_id`, `last_activity_at`, `search_vector` (`tsvector`) e `topic_tags`.
- Duplicar uma tabela separada de feed quebraria a busca unificada, a moderação existente (`moderate_topic`, `moderate_post`), os `reports` (`topic_id`, `post_id`) e as notificações (`topic_id`, `post_id`).

## 2. Extensões Propostas em `topics` e Votos (UPs)
1. **Diferenciação de tipo de publicação na Timeline (`topics`):**
   - Novo ENUM proposto `public.topic_kind` (`'discussion'`, `'question'`, `'tool_share'`, `'note'`) com coluna `kind public.topic_kind not null default 'discussion'`.
   - Coluna opcional `shared_url text` (validada com `^https?://` e `<= 2048`) ou `resource_id uuid references public.resources(id) on delete set null` para compartilhamento de ferramentas/repositórios diretamente na timeline.
   - Ajuste de constraint `topics_title_len` (permitir títulos opcionais ou curtos em `'note'`/`'tool_share'`, ou manter mínimo de 5 caracteres para consistência editorial).
2. **UPs em publicações da timeline (além de respostas):**
   - Atualmente `public.votes` referencia apenas `post_id` (`primary key (user_id, post_id)`).
   - **Proposta:** criar `public.topic_votes (user_id, topic_id, created_at)` + coluna `vote_count integer not null default 0` em `public.topics` mantida por trigger `SECURITY DEFINER` (`on_topic_vote_changed`), preservando `public.votes` intacta para respostas (`posts`).

## 3. Comportamento por Estado de Autenticação
- **Visitante (`/`):** Continua vendo **exclusivamente** a landing page institucional pública (Etapa 10.2), sem acesso ao feed, busca, categorias ou perfis.
- **Usuário autenticado (`/`):** A rota `/` passa a renderizar a **Timeline Social** (ou alternar para a Timeline quando `session` server-side estiver autenticada), exibindo:
  - Composer rápido no topo (escolhendo categoria, tipo: Publicação/Discussão/Pergunta/Ferramenta, e tags).
  - Feed paginado (cursor/keyset por `created_at` ou `last_activity_at`) com autor (`public_profiles`), horário relativo/absoluto, categoria, tags, contador de UPs, contador de comentários e ações (Dar UP, Comentar, Compartilhar, Denunciar).
  - Filtros por tipo (`Todos`, `Discussões`, `Perguntas`, `Ferramentas`), categoria e ordenação (`Recentes` / `Em alta`).
