# REVALIDAÇÃO DAS EVIDÊNCIAS DE TESTE — ETAPA 10.3.2.5

## 1. Reexecução Independente em `vexor_etapa10_3_2_5` (PostgreSQL 18)
- `run-revision-2-tests.sql`: 4/4 blocos aprovados (`AUD-SEC-01`..`05`).
- `run-revision-3-tests.sql`: aprovado (`AUD-REV2-02`).
- Teste paralelo independente com 3 conexões `psql` simultâneas (50 pares `A<->B` + 10 envios `A<->C`): `Batch 1` e `Batch 2` retornaram `0` em todos os jobs (`100` mensagens persistidas em `convAB`, `0` deadlocks `40P01`).
- Rollback após lock `FOR NO KEY UPDATE` + envio subsequente: `Post-rollback send rc: 0`.
- Nota sobre o teste de 100 iterações da Etapa 10.3.2.4: o harness usou conexões `psql` reais em paralelo e ajustou `created_at = now() - interval '5 minutes'` entre lotes de 25 pares exclusivamente para não acionar o limite de 30 DMs/min; todas as transações chamaram `send_direct_message` real sob role `authenticated`.
