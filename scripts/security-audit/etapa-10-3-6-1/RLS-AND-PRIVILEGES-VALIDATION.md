# VALIDAÇÃO DE RLS E PRIVILÉGIOS — ETAPA 10.3.6.1

## Evidências Observadas em `vexor_etapa10_3_6_1` ([run-etapa-10-3-6-1-tests.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-10-3-6-1/run-etapa-10-3-6-1-tests.sql))
1. **`anon`:** Bloqueado (`42501`) ao tentar `INSERT` em `public.topics` (com `kind`).
2. **`authenticated` (membro ativo):** Inseriu com sucesso em `(category_id, title, body, kind, shared_url, resource_id)`; `author_id` assumiu `auth.uid()`, `status = 'published'`, `vote_count = 0`.
3. **Colunas protegidas:** Tentativas de `INSERT` em `author_id`, `status`, `vote_count` e `created_at` falharam com `42501` (`insufficient_privilege`).
4. **Usuário suspenso (`is_suspended = true`):** Bloqueado pela policy `topics_insert_member` com `42501`.
5. **Publicação `supabase_realtime`:** `direct_messages` e `notifications` presentes junto à tabela pré-existente `posts` (`total = 3`).
