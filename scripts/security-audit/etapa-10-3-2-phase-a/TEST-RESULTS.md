# RESULTADOS DOS TESTES ISOLADOS — ETAPA 10.3.2 (FASE A)

## 1. Aplicação da Cadeia Completa de Migrations
Executado em PostgreSQL 18 (`.pg_test_cluster`, porta `5433`, banco temporário `vexor_etapa10_3_2`, com `psql -v ON_ERROR_STOP=1`):
- `postgres_bootstrap.sql` → OK
- `20261110000001_schema.sql` → OK
- `20261110000002_functions_triggers.sql` → OK
- `20261110000003_rls_and_grants.sql` → OK
- `20261113143000_security_hardening.sql` → OK
- `20261116114600_research_submissions.sql` → OK
- `PROPOSED-SOCIAL-MIGRATION.sql` (SHA-256 `35031D14AACE6B27E5568C0339266ABB9A1821C9C10B26D1E96642EA382E496B`) → **COMMIT com 0 erros**

## 2. Resultados dos Blocos de [run-isolated-pg-tests.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-10-3-2-phase-a/run-isolated-pg-tests.sql)
| Bloco | Achados Cobertos | Resultado Observado |
|---|---|---|
| Bloco 1 | `AUD-02` | `PASS AUD-02: anon bloqueado (42501) em topics, posts e resources` |
| Bloco 2 | `AUD-06`, `AUD-07` | `PASS AUD-06 & AUD-07: title 5..200 validado e keyset (created_at, id) sem duplicação/perda` |
| Bloco 3 | `AUD-03` | `PASS AUD-03: toggle UP/un-UP consistente (vote_count=2, notif=1, zero auto-notificação)` |
| Bloco 4 | `AUD-01`, `AUD-05` | `PASS AUD-01 & AUD-05: DMs isoladas sem 42P17, snapshot imutável preservado e bloqueio bilateral ativo` |
| Bloco 5 | `AUD-04`, `AUD-08`, `AUD-10` | `PASS AUD-04, AUD-08 & AUD-10: hierarquia, dedupe de advertência, revogação e menções com user_blocks OK` |

## 3. Limpeza do Ambiente
- Banco temporário `vexor_etapa10_3_2` removido (`DROP DATABASE`).
- Cluster `.pg_test_cluster` encerrado (`pg_ctl stop`).
