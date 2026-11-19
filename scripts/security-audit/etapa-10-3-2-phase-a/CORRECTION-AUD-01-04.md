# CORREÇÕES AUD-01 A AUD-04

## AUD-01 — Recursão na RLS de Mensagens Privadas
- **Problema identificado (Etapa 10.3.1):** Policies de `direct_conversation_members` consultando a própria tabela causam erro `42P17` (infinite recursion detected in policy).
- **Correção aplicada em [PROPOSED-SOCIAL-MIGRATION.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-10-3-2-phase-a/PROPOSED-SOCIAL-MIGRATION.sql):**
  - Criada função `public.is_dm_participant(p_conversation_id uuid)` com `SECURITY DEFINER`, `STABLE`, `SET search_path = ''`, usando exclusivamente `auth.uid()`.
  - Todas as policies de `direct_conversations`, `direct_conversation_members` e `direct_messages` usam `public.is_dm_participant(conversation_id)` em vez de subconsultas autorreferenciais.
  - `EXECUTE` revogado de `PUBLIC`/`anon` e concedido apenas a `authenticated`.
- **Resultado esperado/validado:** Ausência de `42P17`; isolamento total entre participante, usuário externo, usuário sem sessão e conversa inexistente.

## AUD-02 — Acesso Indevido de `anon` às Tabelas
- **Problema identificado:** `20261110000003_rls_and_grants.sql` concedia `SELECT` para `anon` em `topics`, `posts`, `resources`, `categories`, `tags` e `topic_tags`, permitindo leitura direta via PostgREST por visitantes anônimos.
- **Correção aplicada:**
  - `REVOKE SELECT ON public.topics, public.posts, public.resources, public.categories, public.tags, public.topic_tags FROM anon;`
  - Mantidos integralmente os privilégios de `authenticated` (incluindo `INSERT (category_id, title, body)` em `topics`).
  - A landing page institucional pública não depende de leitura direta dessas tabelas por `anon`.
- **Resultado esperado/validado:** Consultas como `anon` falham com SQLSTATE `42501` (`permission denied`).

## AUD-03 — `topic_votes`, Consistência Concorrente e `vote_count`
- **Problema identificado:** Contagem de UPs em tópicos sem lock explícito ou validação de concorrência poderia gerar divergência entre `topics.vote_count` e `topic_votes`.
- **Correção aplicada:**
  - Criada `public.topic_votes (id, topic_id, user_id, created_at)` com `UNIQUE (topic_id, user_id)`.
  - Coluna `topics.vote_count integer NOT NULL DEFAULT 0 CHECK (vote_count >= 0)` adicionada de forma idempotente.
  - Trigger `topic_votes_after_change` atualiza `vote_count` atomicamente em `INSERT`/`DELETE`.
  - RPC `public.toggle_topic_vote(p_topic_id uuid)` bloqueia usuários suspensos (`42501`), adquire `FOR UPDATE NOWAIT` (`55P03`) no tópico alvo, faz toggle e retorna o novo estado + contagem exata.

## AUD-04 — Advertências (`user_warnings`), Hierarquia e Revogação Auditável
- **Problema identificado:** Risco de advertências duplicadas, falta de hierarquia (moderador advertindo admin/moderador), confusão com suspensão e revogação sem trilha de auditoria.
- **Correção aplicada:**
  - Criada `public.user_warnings` com `status` (`active`, `revoked`), `dedupe_key` único parcial/normalizado, `reason`, `description` (obrigatória), `issued_by`, `revoked_by`, `revoked_at`, `revoke_reason`.
  - RPC `public.issue_user_warning(...)`: exige `moderator` ou `admin` ativo, impede auto-advertência, impede moderador de advertir `moderator`/`admin`, exige justificativa e envia notificação `user_warning`.
  - RPC `public.revoke_user_warning(p_warning_id uuid, p_reason text)`: aplica mesma regra hierárquica, registra motivo/autor/timestamp e grava em `audit_logs`.
