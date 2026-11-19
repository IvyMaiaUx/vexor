# REVALIDAÇÃO DAS EVIDÊNCIAS DE TESTE — ETAPA 10.3.2.3

## 1. Testes Reexecutados Independentemente nesta Auditoria (Banco `vexor_etapa10_3_2_3`)
- **Aplicação limpa:** `postgres_bootstrap.sql` + 5 migrations oficiais + `PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql` → **COMMIT (0 erros)**.
- **`run-revision-2-tests.sql`:** Todos os 4 blocos (`AUD-SEC-01`, `AUD-SEC-02`, `AUD-SEC-03 & AUD-SEC-05`, `AUD-SEC-04`) aprovados sob roles reais (`anon` e `authenticated`).
- **Rate limit concorrente (2 conexões paralelas no limite `29`):** 1ª chamada aprovada (`COMMIT`), 2ª bloqueada (`ERRO: rate limit exceeded`, `42901`), total persistido = `30`.
- **Reprodução de deadlock em `direct_conversations` (`AUD-REV2-01`):** Duas transações mantendo `FOR SHARE NOWAIT` e executando `UPDATE direct_conversations` geraram `ERRO: impasse detectado` (`40P01`) entre processos `15368` e `21472`.

## 2. Revisão dos 7 Scripts de Regressão (`Etapa 10.3.2.2`)
- `test-supabase-infra-etapa9-1.mjs`: atualizado de forma íntegra (valida nominalmente todas as 5 migrations em ordem cronológica e sem duplicatas).
- `test-research-backend-etapa9-7-2a.mjs`: `createMockSupabase` atualizado para simular `research_submissions`, `public_profiles`, `categories` e `research_recipients`, mantendo intactas todas as assertions de auth (`401`/`403`), anti-enumeração (`404` uniforme), validação (`400`) e segurança estática (`no-store`, zero `service_role`/`localStorage`).
- Todos os 7 scripts + `tsc --noEmit` + `eslint src --max-warnings=0` passaram com exit code `0`.
