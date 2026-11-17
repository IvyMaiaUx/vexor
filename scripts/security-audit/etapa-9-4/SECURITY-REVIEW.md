# VEXOR — Etapa 9.4: Revisão de Segurança

## 1. Controles Implementados na Aplicação
- **Anti-spoofing de autoria e privilégios:** `createForumTopic`, `updateForumTopic`, `createForumPost` e `updateForumPost` rejeitam explicitamente chaves proibidas (`id`, `author_id`, `status`, `is_pinned`, `is_locked`, `accepted_post_id`, `vote_count`, `topic_id` em edição de post, etc.) antes de qualquer chamada ao banco.
- **Menor privilégio em payloads:**
  - `topics` insert/update envia exclusivamente `{ category_id, title, body }`.
  - `posts` insert envia `{ topic_id, body }`; update envia `{ body }`.
  - `votes` insert envia exclusivamente `{ post_id }` (sem `user_id`, utilizando `DEFAULT auth.uid()`).
- **Isolamento de conteúdo não publicado:** Todas as consultas públicas de leitura em `topics` e `posts` aplicam `.eq("status", "published")`, evitando exposição de conteúdo `hidden` ou `deleted` mesmo quando visualizado por autores ou moderadores em rotas públicas.
- **Privacidade de perfis:** Autores são consultados exclusivamente pela view `public.public_profiles` (`id, username, display_name, avatar_url`), nunca consultando `public.profiles` de terceiros nem expondo `role` ou `is_suspended`.
- **Autorização de resposta aceita:** Delegada integralmente à RPC `set_accepted_post`, com tratamento de códigos `42501`, `P0002` e `22023`.
- **Prevenção de concorrência:** Guardas single-flight (`inFlightRef` / `inFlightVotesRef`) em criação, edição, voto e marcação de solução aceita.
- **XSS:** Todo conteúdo Markdown continua renderizado via `MarkdownView` com sanitização estrita de URLs (`getSafeExternalHref`).
