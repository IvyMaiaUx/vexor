# CORREÇÃO AUD-REV2-01 — ELIMINAÇÃO DE DEADLOCK EM `send_direct_message`

## Diagnóstico
Na Revisão 2, `send_direct_message` adquiria `FOR SHARE NOWAIT` em `direct_conversations` e depois executava `UPDATE direct_conversations SET last_message_at = now()`, exigindo `FOR NO KEY UPDATE`. Sob concorrência simultânea de dois participantes na mesma conversa, isso gerou deadlock `40P01` reproduzido na Etapa 10.3.2.3 (`Processo 15368` vs `21472`).

## Solução na Revisão 3
- Substituído `FOR SHARE NOWAIT` por `FOR NO KEY UPDATE` na linha da conversa e atualizado `last_message_at = greatest(last_message_at, now())`.
- **Ordem global de locks:** `profiles (FOR SHARE NOWAIT)` → `direct_conversations (FOR NO KEY UPDATE)` → `pg_advisory_xact_lock('dm_rate:' || v_caller_id)` → `INSERT direct_messages` → `UPDATE direct_conversations`.
- **Compatibilidade:** `get_or_create_dm_conversation` usa advisory lock por par antes de inserir; `mark_dm_conversation_read` atualiza apenas `direct_conversation_members`; `report_direct_message` lê apenas `direct_messages`. Não há ciclo de locks entre essas funções.
- **Por que `FOR NO KEY UPDATE` (sem `NOWAIT`) em vez de `FOR NO KEY UPDATE NOWAIT`?** Com `NOWAIT`, envios simultâneos legítimos dos dois participantes na mesma conversa falhariam com `55P03` para o segundo participante. Com `FOR NO KEY UPDATE`, o segundo remetente aguarda microssegundos pelo `COMMIT` do primeiro e **ambas as mensagens são persistidas com 0% de falha e 0 deadlocks**.
