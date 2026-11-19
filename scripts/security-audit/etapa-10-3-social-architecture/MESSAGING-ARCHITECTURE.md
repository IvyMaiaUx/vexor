# VEXOR — Etapa 10.3: Arquitetura de Mensagens Privadas (DMs)

## 1. Modelo de Dados Proposto
Conversas individuais 1-a-1 protegidas por chave canônica de par de usuários para impedir conversas duplicadas entre os mesmos dois participantes:

1. **`public.direct_conversations`:**
   - `id uuid primary key`, `participant_low uuid not null`, `participant_high uuid not null`, `last_message_at timestamptz`, `created_at timestamptz`.
   - Constraint `check (participant_low < participant_high)` + `unique (participant_low, participant_high)` garantindo unicidade 1:1.
2. **`public.direct_conversation_members`:**
   - `conversation_id uuid`, `user_id uuid`, `last_read_at timestamptz`, `is_archived boolean default false`, `muted_until timestamptz`, `primary key (conversation_id, user_id)`.
   - Permite calcular mensagens não lidas (`created_at > coalesce(last_read_at, '-infinity')` e `sender_id <> auth.uid()`).
3. **`public.direct_messages`:**
   - `id uuid primary key`, `conversation_id uuid`, `sender_id uuid`, `body text` (`1..4000` chars), `status public.content_status default 'published'`, `created_at timestamptz`, `edited_at timestamptz`.
4. **`public.user_blocks`:**
   - `blocker_id uuid`, `blocked_id uuid`, `created_at timestamptz`, `primary key (blocker_id, blocked_id)`, `check (blocker_id <> blocked_id)`.

## 2. Segurança Obrigatória e Anti-Enumeração
- **RLS estrita:** Somente usuários listados em `direct_conversation_members` para `conversation_id` podem fazer `SELECT` na conversa, nos membros e nas mensagens.
- **Bloqueio à prova de bypass:** O envio de mensagens deve ocorrer via RPC `SECURITY DEFINER` (`send_direct_message(p_recipient_id uuid, p_body text)` ou `p_conversation_id uuid`), que verifica:
  1. `is_active_member()` (rejeita usuário suspenso);
  2. ausência de bloqueio em **ambas as direções** em `user_blocks`;
  3. pertencimento real à conversa (sem revelar se o outro usuário existe ou bloqueou via mensagem genérica).
- **Sem acesso administrativo irrestrito:** Admins e moderadores **não** possuem política `SELECT` em `direct_messages` ou `direct_conversations`.
- **Procedimento auditável para denúncia de mensagem privada:**
  - Ao denunciar uma mensagem específica, uma RPC `report_direct_message(p_message_id uuid, p_reason, p_details)` valida que `auth.uid()` é participante da conversa, grava o `report` com um **snapshot imutável mínimo** apenas da mensagem denunciada (em `reported_message_snapshots` ou `reports.evidence_snapshot` acessível somente a moderadores durante análise da denúncia) e registra acesso no `audit_logs` quando um moderador abre a evidência.

## 3. Supabase Realtime e Paginação
- **Compatibilidade:** O projeto já usa `@supabase/supabase-js` (`2.119.0`) e `@supabase/ssr` (`0.12.7`), compatíveis com Supabase Realtime.
- **Estratégia segura:** Assinatura Realtime em `direct_messages` filtrada por `conversation_id` (respeitando RLS quando `supabase_realtime` publication estiver habilitada com RLS enforcement) + fallback de polling/revalidação ao focar janela.
- **Paginação:** Cursor-based (`created_at < cursor` ordem `desc`, limite 30 mensagens por página) para carregamento incremental do histórico.
