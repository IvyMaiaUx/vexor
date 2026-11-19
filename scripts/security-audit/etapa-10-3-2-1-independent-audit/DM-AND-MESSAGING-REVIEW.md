# REVISÃO DE MENSAGENS PRIVADAS E REALTIME

## 1. Arquitetura 1:1 e Criação Concorrente
- **Chave canônica:** `direct_conversations` impõe `participant_low < participant_high` e `UNIQUE (participant_low, participant_high)` (L142-143).
- **Concorrência:** `get_or_create_dm_conversation(p_other_user_id)` adquire `pg_advisory_xact_lock(hashtextextended('dm:' || v_low::text || ':' || v_high::text, 0))` e usa `ON CONFLICT DO NOTHING` (L644-678).
- **Bloqueios:** Checa `is_suspended` em caller e target (`for share nowait`) e bloqueio bilateral em `user_blocks`.

## 2. Envio, Paginação e Notificações
- **Envio (`send_direct_message`):** Revalida `is_suspended`, adquire `for share nowait` na conversa, checa participação e `user_blocks` bilateral, aplica rate limit de `30 DMs/min` e deduplica notificação `direct_message` se já houver não-lida na mesma conversa.
- **Paginação:** Índice `direct_messages_conv_keyset_idx` em `(conversation_id, created_at desc, id desc)` garante paginação keyset determinística.
- **Lacunas identificadas:**
  - `AUD-SEC-03` (LOW): `direct_messages_select` não filtra `status = 'published'`, e `direct_conversation_members` não possui RPC/grant para atualizar `last_read_at` (leitura de mensagens não lidas).
  - `AUD-SEC-04` (LOW): Falta índice `(sender_id, created_at desc)` para a query de rate limit.

## 3. Denúncias e Snapshots (`AUD-05`)
- `reported_message_snapshots` não possui `ON DELETE CASCADE` em `direct_messages` (preserva evidência mesmo após exclusão da mensagem) e não tem policies para leitura direta.
- `get_reported_message_evidence(p_report_id)` revalida papel + suspensão pós-lock e registra `write_audit_log('dm.evidence_viewed', ...)`.
- **Defeito confirmado (`AUD-SEC-01`, MEDIUM):** `report_direct_message` sempre cria um novo `reported_message_snapshots` antes do `INSERT` em `reports`, tornando ineficaz `reports_dedupe_message_snapshot (reporter_id, message_snapshot_id)` e permitindo múltiplas denúncias/snapshots para a mesma mensagem.

## 4. Realtime
- `PROPOSED-SOCIAL-MIGRATION.sql` não altera a publicação `supabase_realtime` (correto para Fase A isolada); na Fase B será necessário habilitar Realtime apenas para `direct_messages` / `notifications` respeitando RLS (`is_dm_participant`).
