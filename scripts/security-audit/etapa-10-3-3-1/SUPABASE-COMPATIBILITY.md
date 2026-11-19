# COMPATIBILIDADE COM O SUPABASE (FREE PLAN) — ETAPA 10.3.3.1

## 1. Auth, Roles e RLS
- **`auth.uid()` e `auth.users`:** Todas as RPCs e policies dependem exclusivamente de `auth.uid()` e `public.profiles(id)` (sincronizada via `handle_new_user`), sem consultar `auth.users` diretamente no runtime de cliente.
- **`anon` vs `authenticated`:** `REVOKE SELECT ON topics, posts, resources, categories, tags, topic_tags FROM anon` protege conteúdo interno. Em `src/app/page.tsx`, `queryCatalogResources` já é protegido por `if (!user || categoriesLoading) return;` (a landing pública não lê tabelas internas como `anon`). Verificar na Fase B apenas se `useCatalogStore`/`useForumStore` não disparam fetch desnecessário de `categories` antes do login.
- **`service_role`:** Nenhum uso de `service_role` necessário no frontend ou nas rotas da aplicação.

## 2. Execução via `supabase db push` e `ALTER TYPE`
- A Revisão 3 coloca `ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS ...` **antes** do bloco `BEGIN; ... COMMIT;`, idêntico ao padrão já executado com êxito por `20261116114600_research_submissions.sql` no mesmo projeto `zcjudcbckcxwnfnrjfte`.
- **Recomendação operacional:** Ao promover na Fase B, revisar no `--dry-run` se `supabase db push` executa declarações individuais ou em transação única (para garantir que `ALTER TYPE` não rode dentro de transação explícita).

## 3. Realtime (Pendente de Teste WebSocket na Fase B)
- A Revisão 3 **ainda não adiciona** `direct_messages` ou `notifications` à publicação `supabase_realtime` (correto para a etapa preparatória).
- Quando habilitado na Fase B:
  - `direct_messages_select` (`is_active_member() AND is_dm_participant(conversation_id) AND status = 'published'`) garante que o Supabase Realtime Postgres Changes entregue eventos apenas aos participantes ativos da conversa.
  - Teste WebSocket real entre dois clientes autenticados permanece **pendente** para a Fase B.

## 4. Limitações do Plano Supabase Free (Sem PITR)
- **Ausência de PITR:** O projeto não possui Point-in-Time Recovery automático; backup lógico prévio ou validação cuidadosa antes do `db push` é essencial.
- **Armazenamento (500 MB) e Conexões Realtime (200):** Índices parciais em `direct_messages` e `user_warnings` são compactos. `reported_message_snapshots` define `retention_until = now() + interval '180 days'` — será necessária rotina futura de expurgo após resolução para evitar crescimento indefinido no plano Free.
