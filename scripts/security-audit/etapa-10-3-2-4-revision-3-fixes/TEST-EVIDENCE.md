# EVIDÊNCIAS DE TESTES — ETAPA 10.3.2.4

1. **Antes da correção (Etapa 10.3.2.3, Revisão 2):** `ERRO: impasse detectado` (`40P01`, `Processo 15368 espera por ShareLock em transação 7862; bloqueado pelo processo 21472`).
2. **Depois da correção (Etapa 10.3.2.4, Revisão 3, banco `vexor_etapa10_3_2_4`):**
   - `run-revision-2-tests.sql`: 4/4 blocos aprovados (`PASS AUD-SEC-01`, `PASS AUD-SEC-02`, `PASS AUD-SEC-03 & AUD-SEC-05`, `PASS AUD-SEC-04`).
   - `run-revision-3-tests.sql`: `PASS AUD-REV2-02: report_direct_message bloqueia hidden/deleted/inexistente (P0002), externo/suspenso (42501) sem snapshot órfão`.
   - 100 pares concorrentes em 2 conexões `psql` paralelas: `200/200` mensagens persistidas, `0` deadlocks `40P01`, `last_message_at_consistent = t`.
   - Banco temporário `vexor_etapa10_3_2_4` removido (`DROP DATABASE`) e `.pg_test_cluster` encerrado (`pg_ctl stop`).
