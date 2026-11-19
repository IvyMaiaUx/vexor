# RESULTADOS DE RLS E CONCORRÊNCIA — ETAPA 10.3.2 (FASE A)

## 1. Isolamento RLS e Papéis Validados
- **`anon` (`AUD-02`):** Bloqueado com SQLSTATE `42501` em `public.topics`, `public.posts` e `public.resources`; sem sessão (`auth.uid() IS NULL`) bloqueado em DMs, `topic_votes` e `user_warnings`.
- **`authenticated` (membro ativo):**
  - Respeita `GRANT INSERT (category_id, title, body)` em `public.topics` (colunas protegidas como `created_at` e `vote_count` negadas para escrita direta).
  - Participante autorizado lê e envia em `direct_conversations` / `direct_messages` sem recursão `42P17`.
  - Usuário externo à conversa não visualiza nem envia mensagens, mesmo conhecendo o UUID da conversa.
  - Bloqueio bilateral (`user_blocks`) impede abertura/envio de DM e suprime notificações de menção em ambas as direções.
- **Usuário suspenso (`is_suspended = true`):**
  - `INSERT INTO public.topic_votes` → bloqueado com SQLSTATE `42501` (`PASS: suspended user blocked on topic_votes (42501)`).
  - `public.get_or_create_dm_conversation(...)` → bloqueado com SQLSTATE `42501` (`PASS: suspended user blocked on DM (SQLSTATE=42501)`).
- **`moderator` vs `admin` (`AUD-04`):**
  - Moderador impedido de advertir ou revogar advertência de outro moderador ou administrador.
  - Moderador/admin lê apenas `dm_report_snapshots` denunciados (imutável, sem `UPDATE`/`DELETE`), sem acesso irrestrito a `direct_messages`.

## 2. Testes de Concorrência Paralela (Conexões `psql` Simultâneas)
1. **Abertura simultânea de DM (`22222222` ↔ `33333333`):**
   - Job 1 e Job 2 executados em paralelo retornaram exatamente o mesmo UUID de conversa (`76dee8a3-4745-4af6-86fa-3d48d922d520`) com `COMMIT` limpo e zero erro de unicidade/deadlock.
2. **UPs simultâneos no mesmo tópico (`Timeline item 4`):**
   - Job 1 (`22222222`) e Job 2 (`33333333`) executados em paralelo com `INSERT INTO public.topic_votes`.
   - Verificação pós-commit: `vote_count|actual_rows = 2|2` (consistência exata entre `topics.vote_count` e `topic_votes`).
