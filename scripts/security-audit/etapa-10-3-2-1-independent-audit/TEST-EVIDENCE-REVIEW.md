# REVISÃO DAS EVIDÊNCIAS DE TESTE DA FASE A

## 1. Verificação Factual
- **Scripts existentes e reais:** [run-isolated-pg-tests.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-10-3-2-phase-a/run-isolated-pg-tests.sql) existe e foi executado em PostgreSQL 18 (`.pg_test_cluster`, porta `5433`, banco temporário `vexor_etapa10_3_2`, com `postgres_bootstrap.sql`).
- **Papéis reais (não superuser):**
  - Bloco 1 usou `set local role anon` e validou `insufficient_privilege` (`42501`).
  - Blocos 2–5 usaram `set local role authenticated` com `request.jwt.claim.sub` alternando entre `Alice`, `Bob`, `Charlie`, `Moderator` e `Admin`.
  - Concorrência paralela foi executada via 2 conexões `psql` independentes (`Start-Job`) para abertura simultânea de DM (`76dee8a3-4745-4af6-86fa-3d48d922d520` em ambas) e 2 UPs simultâneos em `topic_votes` (`vote_count|actual_rows = 2|2`).
  - Usuário suspenso (`is_suspended = true`) foi testado com bloqueio `42501` em `topic_votes` e `get_or_create_dm_conversation`.

## 2. Lacunas e Divergências Encontradas (`AUD-SEC-05`)
1. **Divergência de nomenclatura nos docs da Fase A:** `CORRECTED-ARCHITECTURE.md`, `CORRECTION-AUD-05-08.md` e `TEST-RESULTS.md` citaram nomes que não existem no SQL (`toggle_topic_vote`, `dm_report_snapshots`, `is_blocked_between`, `notify_topic_mentions`), enquanto o SQL real usa `topic_votes`, `reported_message_snapshots`, checagem inline em `user_blocks` e `notify_mentions`.
2. **Testes ausentes no SQL:**
   - Não há tentativa explícita de `UPDATE`/`DELETE` em `reported_message_snapshots` como `authenticated`/`moderator` (a imutabilidade é garantida por `REVOKE ALL`, mas não foi exercitada no script de teste).
   - Não há teste provocando colisão `55P03` (`lock_not_available`) de `NOWAIT`.
   - Não há teste tentando enviar 2 denúncias da mesma `message_id` em `report_direct_message` (por isso `AUD-SEC-01` passou despercebido).
   - Não há teste de `moderator` tentando advertir/revogar outro `moderator` (por isso `AUD-SEC-02` passou despercebido).
