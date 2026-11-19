# RESULTADOS DOS TESTES DE CONCORRÊNCIA — ETAPA 10.3.2.4

## 1. Teste de 100 Iterações Paralelas na Mesma Conversa (`AUD-REV2-01`)
- **Configuração:** 2 conexões `psql` independentes (Participante A `11111111` e Participante B `77777777`) enviando mensagens simultaneamente na mesma conversa (`b1412bb8-cf36-4f6a-a1c5-aa365dfef665`) em 4 lotes paralelos de 25 pares (`100` pares simultâneos = `200` mensagens).
- **Nota de controle do rate limit:** Entre os lotes de 25 pares, as mensagens anteriores do lote foram datadas em `-5 minutes` exclusivamente no harness de teste para não acionar o limite de 30 DMs/min por remetente durante o stress de 100 iterações.
- **Resultado:**
  - `persisted_msgs = 200` (**200/200 mensagens persistidas, 0 falhas**)
  - **Deadlocks `40P01`:** **`0`** (contra deadlock reproduzido na Revisão 2)
  - `last_message_at_consistent = t` (`last_message_at >= max(created_at)`).

## 2. Outros Cenários Concorrentes Executados
- **Envio simultâneo + `mark_dm_conversation_read`:** `rc = 0` (ambos concluídos com `COMMIT`).
- **Envio simultâneo em conversa diferente:** `rc = 0` (sem bloqueio cruzado).
- **Bloqueio de usuário e suspensão:** Validados em `run-revision-2-tests.sql`, `run-revision-3-tests.sql` e `run-isolated-pg-tests.sql` (`42501`).
