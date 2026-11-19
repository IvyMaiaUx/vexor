# RESULTADOS DOS TESTES LOCAIS — ETAPA 10.3.6.1

## 1. Testes PostgreSQL 18 Isolado (`vexor_etapa10_3_6_1`, descartado ao final)
| Teste | Resultado |
|---|---|
| Aplicação da cadeia `bootstrap` + 6 migrations + `20261118183000` (1ª vez) | **PASS (`COMMIT`, exit 0)** |
| Reaplicação de `20261118183000` (2ª vez, idempotência) | **PASS (`COMMIT`, exit 0)** |
| `run-revision-2-tests.sql` (`AUD-SEC-01`..`05`) | **PASS (4/4 blocos)** |
| `run-revision-3-tests.sql` (`AUD-REV2-02`) | **PASS** |
| `run-etapa-10-3-6-1-tests.sql` (`POST-01` + `POST-02`) | **PASS (2/2 blocos)** |

## 2. Regressões da Aplicação (`exit 0`)
- `npx tsc --noEmit` → **PASS (exit 0)**
- `npx eslint src --max-warnings=0` → **PASS (exit 0)**
- `scripts/test-forum-integration-etapa9-4.mjs` → **PASS (20/20)**
- `scripts/test-notifications-reports-etapa9-5.mjs` → **PASS (25/25)**
- `scripts/test-admin-supabase-etapa9-6.mjs` → **PASS (31/31)**

## 3. Testes Não Executados
- Runtime direto em PostgreSQL `17.11` e WebSocket Realtime em servidor Supabase real (não aplicáveis sem acesso de escrita/servidor Realtime local).
