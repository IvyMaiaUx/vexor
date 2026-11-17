# VEXOR — Etapa 9.4: Limitações e Riscos

1. **Votos em tópicos não suportados pelo schema:** A tabela `public.votes` vincula-se apenas a `posts.id`, e `public.topics` não possui `vote_count`. Por isso, o botão de upvote em tópico e a aba de ordenação por votos de tópico foram removidos em vez de simulados localmente.
2. **Perfis e contribuições fora de escopo:** As rotas `/profile`, `/profile/[username]` e `/my-contributions` ainda consomem `useForumStore()`, que nesta etapa retorna listas vazias para evitar mistura com `INITIAL_TOPICS`/`INITIAL_POSTS`. A integração dessas rotas pertence a etapa específica.
3. **Seed administrativo preservado:** `src/features/admin/services/admin-service.ts` continua utilizando `seed-topics.ts` de forma isolada para a simulação administrativa (Etapa 9.5).
4. **Validação de RLS em runtime:** Os testes da Etapa 9.4 utilizaram mocks offline; a execução real das policies RLS, triggers (`on_post_created`, `on_vote_changed`, `topic_tags_limit`) e da RPC `set_accepted_post` no PostgreSQL remoto não foi exercitada nesta etapa.
