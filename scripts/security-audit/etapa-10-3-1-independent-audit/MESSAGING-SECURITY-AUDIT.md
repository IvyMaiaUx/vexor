# VEXOR — Etapa 10.3.1: Auditoria de Segurança das Mensagens Privadas

## 1. Isolamento por Conversa e RLS
- **[CRITICAL] Recursão infinita em RLS de `direct_conversation_members`:** `RLS-AND-SECURITY.md` propôs policy `SELECT` em `direct_conversation_members` fazendo `exists (select 1 from public.direct_conversation_members m where ...)`. No PostgreSQL, uma policy que consulta a própria tabela dispara `ERROR: 42P17: infinite recursion detected in policy for relation "direct_conversation_members"`.
  - **Correção obrigatória:** criar função auxiliar `public.is_dm_participant(p_conversation_id uuid)` `SECURITY DEFINER`, `STABLE`, `set search_path = ''`, que consulta `direct_conversation_members` sem acionar RLS, e usá-la nas policies de `direct_conversations`, `direct_conversation_members` e `direct_messages`.
- **Enumeração de terceiros:** Com `is_dm_participant(conversation_id)` nas policies e `get_or_create_dm_conversation` retornando erro genérico quando há bloqueio ou alvo inexistente/suspenso, terceiros não conseguem consultar nem enumerar conversas alheias.

## 2. Bloqueio Bilateral, Envio Concorrente e Rate Limiting
- **Bloqueio à prova de bypass:** A RPC `send_direct_message` deve verificar `is_active_member()`, pertencimento em `direct_conversation_members` e ausência de registro em `user_blocks` nas **duas direções** (`(blocker_id = sender and blocked_id = other) or (blocker_id = other and blocked_id = sender)`), sob `FOR SHARE` ou lock na conversa para evitar condição de corrida entre bloqueio simultâneo e envio.
- **Criação concorrente de conversa 1:1:** `get_or_create_dm_conversation` deve usar `INSERT INTO direct_conversations (participant_low, participant_high) ... ON CONFLICT (participant_low, participant_high) DO NOTHING` (usando `least(u1, u2)` e `greatest(u1, u2)`) seguido de `SELECT`, garantindo idempotência sem race condition.

## 3. Realtime, Não Lidas, Denúncias e Retenção
- **Realtime:** `direct_messages` precisa de `REPLICA IDENTITY FULL` apenas se houver `UPDATE`/`DELETE` filtrado; para `INSERT`, o filtro por `conversation_id` respeita RLS se `is_dm_participant` for eficiente e indexado (`(user_id, conversation_id)`).
- **[HIGH] Preservação de evidência em denúncia de DM:** Se `reported_message_snapshots` depender de FK com `ON DELETE CASCADE` em `direct_messages` (ou se o remetente apagar a mensagem antes da análise), a evidência se perde. **Correção:** `reported_message_snapshots` deve armazenar cópia imutável (`message_id uuid` sem cascade delete, `conversation_id uuid`, `sender_id uuid`, `body_snapshot text`, `sent_at timestamptz`, `captured_by uuid`), sem `GRANT SELECT` direto — leitura apenas via RPC `get_reported_message_evidence(p_report_id)` que exige `is_moderator()` e grava `dm.evidence_viewed` em `audit_logs`.
- **[MEDIUM] Cursor de paginação:** Usar `(created_at, id) < (p_ts, p_id)` para evitar perda de mensagens enviadas no mesmo milissegundo.
