# AUDITORIA DE CONCORRÊNCIA E LOCKS — REVISÃO 3

## 1. Análise Global de Locks
- `send_direct_message`: `profiles (FOR SHARE NOWAIT)` → `direct_conversations (FOR NO KEY UPDATE)` → `pg_advisory_xact_lock('dm_rate:' || v_caller_id)` → `INSERT direct_messages` → `UPDATE direct_conversations (last_message_at = greatest(last_message_at, now()))`.
- `get_or_create_dm_conversation`: `pg_advisory_xact_lock('dm:low:high')` → `profiles (FOR SHARE NOWAIT)` → `INSERT ON CONFLICT DO NOTHING`.
- `mark_dm_conversation_read`: `profiles (FOR SHARE NOWAIT)` → `UPDATE direct_conversation_members`.
- `report_direct_message`: `profiles (FOR SHARE NOWAIT)` → `direct_messages (FOR SHARE NOWAIT)` → `reports_dedupe_direct_message_active`.
- `issue_user_warning` / `revoke_user_warning`: `pg_advisory_xact_lock(6216471958360507469)` → `profiles caller (FOR SHARE NOWAIT)` → target.

## 2. Evidência Independente Executada (`vexor_etapa10_3_2_5`)
- 3 jobs `psql` paralelos simultâneos (50 pares `A<->B` na mesma conversa + 10 envios `A<->C` concorrentes): `Batch 1 exit codes: j1=0 j2=0 j3=0`, `Batch 2 exit codes: j1=0 j2=0 j3=0`, `convAB persisted messages = 100`, `0` deadlocks `40P01`.
- Rollback após lock `FOR NO KEY UPDATE` + envio subsequente: `Post-rollback send rc: 0`.
