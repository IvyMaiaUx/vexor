# AUDITORIA DE MENSAGENS PRIVADAS — REVISÃO 2

## 1. Pontos Validados
- **Isolamento 1:1:** `direct_conversations` impõe `participant_low < participant_high` + `UNIQUE (participant_low, participant_high)`.
- **Anti-recursão:** `is_dm_participant(uuid)` (`SECURITY DEFINER`, `STABLE`, `SET search_path = ''`, `auth.uid()`) impede `42P17` e não revela conversas de terceiros.
- **Visibilidade (`AUD-SEC-03`):** `direct_messages_select` filtra `is_active_member()`, `is_dm_participant(conversation_id)` e `status = 'published'`.
- **Leitura (`mark_dm_conversation_read`):** Atualiza apenas `last_read_at` do próprio usuário com monotonicidade (`greatest(...)`) e erro uniforme `42501` para não participantes/suspensos.
- **Rate limit (`AUD-SEC-04`):** Índice parcial `direct_messages_sender_recent_idx` + `pg_advisory_xact_lock('dm_rate:' || v_caller_id)`. Testado em paralelo no limite `29 -> 30` (2ª chamada bloqueada com `42901`, contagem final `30`).
- **Denúncia (`AUD-SEC-01`):** `report_direct_message` bloqueia duplicidade ativa antes do snapshot e usa índice único parcial `reports_dedupe_direct_message_active` (zero snapshot órfão).

## 2. Achados Identificados
- **`AUD-REV2-01` (MEDIUM):** `send_direct_message` faz `FOR SHARE NOWAIT` em `direct_conversations` (L717) e depois `UPDATE direct_conversations SET last_message_at = now()` (L759), causando deadlock `40P01` se os dois participantes enviarem na mesma conversa no mesmo instante.
- **`AUD-REV2-02` (LOW):** `report_direct_message` não filtra `dm.status = 'published'`.
