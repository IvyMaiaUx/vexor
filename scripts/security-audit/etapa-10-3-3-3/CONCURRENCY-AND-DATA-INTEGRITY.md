# AUDITORIA DE CONCORRÊNCIA E INTEGRIDADE DE DADOS — ETAPA 10.3.3.3

- **`send_direct_message`:** Usa `FOR NO KEY UPDATE` na conversa + `greatest(last_message_at, now())` + `pg_advisory_xact_lock('dm_rate:' || v_caller_id)` (ordem global sem ciclos).
  - *Evidência PG 18 anterior:* 100 pares concorrentes (`200/200` mensagens persistidas, `0` deadlocks `40P01`) + rate limit paralelo (`29 -> 30`, 2ª chamada `42901`). *Não comprova runtime PG 17.11.*
- **`report_direct_message`:** Usa `FOR SHARE NOWAIT` na mensagem + checagem pré-snapshot + `reports_dedupe_direct_message_active` (`1|1` em concorrência paralela).
- **`issue_user_warning` / `revoke_user_warning`:** Serializados via `pg_advisory_xact_lock(6216471958360507469)` + `FOR SHARE NOWAIT` / `FOR UPDATE NOWAIT` (rebaixamento concorrente bloqueado pós-lock com `42501`).
- **`topic_votes`:** PK `(user_id, topic_id)` + `UPDATE topics SET vote_count = vote_count ± 1` + `exception when others then null` em notificações (`2|2` em concorrência paralela).
- **Snapshots e `ON DELETE`:** `reported_message_snapshots` sem FK `ON DELETE CASCADE` para `direct_messages` ou `direct_conversations` e `ON DELETE SET NULL` para perfis, garantindo preservação integral de evidências.
