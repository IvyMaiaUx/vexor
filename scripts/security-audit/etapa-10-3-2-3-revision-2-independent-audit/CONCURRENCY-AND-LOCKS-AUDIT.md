# AUDITORIA DE CONCORRÊNCIA E LOCKS — REVISÃO 2

| Cenário Analisado | Ordem de Locks / Mecanismo | Risco de Deadlock / Corrida | Resultado / Evidência |
|---|---|---|---|
| 1. Duas denúncias simultâneas da mesma DM | `dm FOR SHARE NOWAIT` → `reports_dedupe_direct_message_active` | Sem deadlock; 2ª aborta com `23505` e rollback total | **Testado em paralelo (`1|1`)** |
| 2. Duas advertências simultâneas | `pg_advisory_xact_lock(6216471958360507469)` → caller `FOR SHARE` → target `FOR UPDATE` | Serializado; `user_warnings_report_active_key` impede duplicidade por report | **Seguro** |
| 3. Revogação simultânea da mesma advertência | `pg_advisory_xact_lock` → caller `FOR SHARE` → warning `FOR UPDATE` → target `FOR SHARE` | Serializado; 2ª vê `status = 'revoked'` (`22023`) | **Seguro** |
| 4. Rebaixamento durante `issue_user_warning` | Mesmo advisory lock `6216471958360507469` de `admin_set_user_role` | Sem deadlock; revalidação pós-lock bloqueia (`42501`) | **Testado em paralelo (`PASS`)** |
| 5. Suspensão durante `send_direct_message` | `profiles FOR SHARE NOWAIT` no caller | Sem stale auth após lock | **Seguro** |
| 6. Criação simultânea da mesma DM | `pg_advisory_xact_lock('dm:' || low || ':' || high)` + `ON CONFLICT` | Idempotente; mesmo UUID retornado | **Testado em paralelo** |
| 7-8. UPs simultâneos / toggle em `topic_votes` | PK `(user_id, topic_id)` + `UPDATE topics SET vote_count = vote_count ± 1` | Row lock sequencial em `READ COMMITTED`, sem perda | **Testado em paralelo (`2|2`)** |
| 9. Rajada simultânea > 30 DMs/min | `pg_advisory_xact_lock('dm_rate:' || v_caller_id)` | Serializado por remetente; excedente recebe `42901` | **Testado em paralelo (contagem `30`)** |
| 10. Atualização simultânea de `last_read_at` | `UPDATE ... WHERE conversation_id = ... AND user_id = v_caller_id` com `greatest(...)` | Cada participante atualiza apenas sua própria linha | **Seguro** |
| **11. Dois participantes enviando na mesma DM** | `direct_conversations FOR SHARE NOWAIT` → `UPDATE direct_conversations` | **DEADLOCK (`40P01`) por upgrade de lock `SHARE -> NO KEY UPDATE`** | **Reproduzido (`AUD-REV2-01`, MEDIUM)** |
