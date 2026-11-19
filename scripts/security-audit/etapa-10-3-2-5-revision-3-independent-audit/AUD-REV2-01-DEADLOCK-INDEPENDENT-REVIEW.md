# REVISÃO INDEPENDENTE: AUD-REV2-01 (DEADLOCK EM `send_direct_message`)

## 1. Análise do SQL (`PROPOSED-SOCIAL-MIGRATION-REVISION-3.sql`, L706–795)
- **Posição do lock:**
  1. `profiles` (`FOR SHARE NOWAIT`, L730) → valida `not is_suspended`.
  2. `direct_conversations` (`FOR NO KEY UPDATE`, L736) → serializa atualizações da conversa antes da checagem de participação (`direct_conversation_members`), `user_blocks`, advisory lock de rate limit (`pg_advisory_xact_lock('dm_rate:' || v_caller_id)`), `INSERT direct_messages` e `UPDATE direct_conversations`.
- **Compatibilidade e ausência de ciclo:**
  - `get_or_create_dm_conversation`: adquire `pg_advisory_xact_lock('dm:low:high')` antes de `profiles FOR SHARE NOWAIT` e `INSERT ... ON CONFLICT DO NOTHING`. Não adquire lock de atualização em `direct_conversations` já existente.
  - `mark_dm_conversation_read`: adquire `profiles FOR SHARE NOWAIT` → `direct_conversation_members` (`UPDATE`). Não adquire lock em `direct_conversations`.
  - `report_direct_message`: adquire `profiles FOR SHARE NOWAIT` → `direct_messages FOR SHARE NOWAIT`. Não atualiza `direct_conversations`.
  - `user_blocks`: lido apenas via `EXISTS` (sem lock de escrita concorrente em `send_direct_message`).
- **Observação sobre `FOR NO KEY UPDATE` sem `NOWAIT`:** Em conversas normais, o lock dura microssegundos até o `COMMIT` do remetente paralelo, eliminando tanto `40P01` quanto falhas espúrias `55P03`. Apenas se uma transação externa administrativa mantiver lock exclusivo longo na linha da conversa haveria espera (sem deadlock).

## 2. Análise de `last_message_at = greatest(last_message_at, now())`
- `now()` no PostgreSQL retorna `transaction_timestamp()` (início da transação). Se a transação B iniciou 1ms antes de A, mas A adquiriu `FOR NO KEY UPDATE` e commitou primeiro, `greatest(last_message_at, now())` impede que B regrida `last_message_at` para o timestamp ligeiramente anterior de B.
- A ordenação das mensagens dentro da conversa usa `direct_messages_conv_keyset_idx (conversation_id, created_at desc, id desc)`, independente de `last_message_at` (que ordena a lista de conversas).
- Como `INSERT direct_messages` e `UPDATE direct_conversations` ocorrem na mesma transação atômica, um rollback reverte ambos.

## 3. Veredito
**CORRIGIDO E VALIDADO.** Deadlock `40P01` eliminado.
