# RESULTADOS DE CONCORRÊNCIA E RLS — ETAPA 10.3.2.2

## 1. Testes de Concorrência Paralela (Conexões `psql` Independentes)
1. **Denúncia simultânea da mesma DM pelo mesmo usuário (`AUD-SEC-01`):**
   - Job 1 e Job 2 executados em paralelo com `report_direct_message` na mesma `message_id`.
   - Job 1 concluiu com `COMMIT` (`5d6ce6ca-f44a-418e-b171-4912a08172aa`); Job 2 foi rejeitado com `duplicate active report for message` (`23505`).
   - Persistência verificada: `snapshots|reports = 1|1` (zero snapshot órfão).
2. **Colisão `NOWAIT` controlada (`55P03`) + liberação pós-rollback (`AUD-SEC-05`):**
   - Conexão 1 manteve `FOR UPDATE` em `direct_conversations`; Conexão 2 chamou `send_direct_message` e capturou `lock_not_available` (`55P03`).
   - Após `ROLLBACK` da Conexão 1, nova chamada a `send_direct_message` concluiu com `COMMIT` (`8f944149-f1d3-463f-8285-af80180df3fb`).
3. **Rebaixamento concorrente durante advertência (`AUD-SEC-02`):**
   - Conexão 1 adquiriu `pg_advisory_xact_lock(6216471958360507469)`, rebaixou `Mod1` para `member` e dormiu 2s antes do `COMMIT`.
   - Conexão 2 (`Mod1`) chamou `issue_user_warning`, aguardou o advisory lock e, na revalidação pós-lock, foi bloqueada com `42501` (`PASS: demoted mod blocked after lock (42501)`).

## 2. Isolamento RLS Validado sob Roles Reais (`anon` / `authenticated`)
- `UPDATE` e `DELETE` diretos em `reported_message_snapshots` como `moderator` (`authenticated`) rejeitados com `42501`.
- `UPDATE` direto em `direct_conversation_members` rejeitado com `42501`.
- `mark_dm_conversation_read` bloqueado com `42501` uniforme para terceiro e para usuário suspenso.
