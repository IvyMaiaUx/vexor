# RESULTADOS DOS TESTES SQL — ETAPA 10.3.2.2

## 1. Aplicação da Cadeia Completa sobre `PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql`
Executado em PostgreSQL 18 isolado (`.pg_test_cluster`, porta `5433`, banco temporário `vexor_etapa10_3_2_2`):
- `postgres_bootstrap.sql` + 5 migrations oficiais + `PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql` → **COMMIT com 0 erros**.

## 2. Suíte Original da Fase A (`run-isolated-pg-tests.sql`)
- `PASS AUD-02`: `anon` bloqueado (`42501`) em `topics`, `posts` e `resources`.
- `PASS AUD-06 & AUD-07`: `topics.title` (`5..200`, `NOT NULL`) e keyset `(created_at, id)` sem duplicação/perda.
- `PASS AUD-03`: toggle UP/un-UP consistente (`vote_count=2`, `notif=1`, zero auto-notificação).
- `PASS AUD-01 & AUD-05`: DMs isoladas sem `42P17`, snapshot preservado e bloqueio bilateral ativo.
- `PASS AUD-04, AUD-08 & AUD-10`: hierarquia, dedupe de advertência, revogação e menções com `user_blocks`.

## 3. Nova Suíte Pós-Auditoria (`run-revision-2-tests.sql`)
- `PASS AUD-SEC-01`: deduplicação ativa (`23505`), zero snapshot órfão, outro usuário aceito e histórico pós-resolução preservado.
- `PASS AUD-SEC-02`: hierarquia `admin > moderator > member`, bloqueio de `mod -> mod`, `mod -> admin`, auto-advertência, auto-revogação, usuário suspenso e verificação de `audit_logs` + `notifications`.
- `PASS AUD-SEC-03 & AUD-SEC-05`: `mark_dm_conversation_read` restrito ao próprio participante, ocultação de DMs com `status = 'hidden'`, bloqueio de `UPDATE` direto em `direct_conversation_members` e bloqueio de `UPDATE`/`DELETE` em `reported_message_snapshots` como `moderator` (`42501`).
- `PASS AUD-SEC-04`: índice `direct_messages_sender_recent_idx` verificado, rate limit de 30 DMs/min (`42901` na 31ª) e `EXPLAIN (ANALYZE, BUFFERS)` confirmando `Index Only Scan using direct_messages_sender_recent_idx` (`0.715 ms`, `Buffers: shared hit=2`).
