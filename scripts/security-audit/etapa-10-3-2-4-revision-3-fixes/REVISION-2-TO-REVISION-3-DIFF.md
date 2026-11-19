# DIFF FUNCIONAL: REVISÃO 2 → REVISÃO 3

## 1. `public.send_direct_message(uuid, text)` (`AUD-REV2-01`)
- **Antes (Revisão 2):** `perform 1 from public.direct_conversations where id = p_conversation_id for share nowait;` e `set last_message_at = now()`.
- **Depois (Revisão 3):** `perform 1 from public.direct_conversations where id = p_conversation_id for no key update;` e `set last_message_at = greatest(last_message_at, now())`.
- **Motivo:** Elimina upgrade de lock `SHARE -> NO KEY UPDATE` (deadlock `40P01`) quando dois participantes enviam DMs simultaneamente na mesma conversa, mantendo todas as 200 mensagens persistidas sem erro transitório `55P03` e garantindo monotonicidade de `last_message_at`.

## 2. `public.report_direct_message(uuid, public.report_reason, text)` (`AUD-REV2-02`)
- **Antes (Revisão 2):** `where dm.id = p_message_id for share nowait;`.
- **Depois (Revisão 3):** `where dm.id = p_message_id and dm.status = 'published'::public.content_status for share nowait;`.
- **Motivo:** Impede denúncia de DMs já ocultas/removidas, retornando `P0002` uniforme com mensagem inexistente (sem vazamento de existência).
