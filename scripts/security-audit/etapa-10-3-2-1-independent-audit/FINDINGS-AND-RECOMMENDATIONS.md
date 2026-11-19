# ACHADOS E RECOMENDAÇÕES — ETAPA 10.3.2.1

## Resumo por Gravidade
- **CRITICAL:** 0
- **HIGH:** 0
- **MEDIUM:** 2 (`AUD-SEC-01`, `AUD-SEC-02`)
- **LOW:** 3 (`AUD-SEC-03`, `AUD-SEC-04`, `AUD-SEC-05`)
- **INFORMATIONAL:** 2 (`AUD-INFO-01`, `AUD-INFO-02`)

---

## Achados Detalhados

### 1. `AUD-SEC-01` — Spam de snapshots e denúncias duplicadas da mesma DM
- **Gravidade:** `MEDIUM` (Defeito de integridade)
- **Arquivo / Objeto:** `PROPOSED-SOCIAL-MIGRATION.sql` — `reports_dedupe_message_snapshot` (L195-197) e `public.report_direct_message` (L771-829).
- **Cenário de falha:** Cada chamada a `report_direct_message` insere um novo registro em `reported_message_snapshots` com novo UUID `id` (L815-821) e depois insere em `reports (reporter_id, message_snapshot_id, ...)`. Como `message_snapshot_id` é sempre inédito, o índice `reports_dedupe_message_snapshot` nunca dispara.
- **Impacto:** Um participante pode inundar `reported_message_snapshots` (retenção de 180 dias) e a fila de moderação com denúncias repetidas da mesma `message_id`.
- **Evidência:** L195-197 e L815-825 de `PROPOSED-SOCIAL-MIGRATION.sql`.
- **Correção recomendada:** Verificar existência de denúncia ativa (`status in ('open', 'reviewing')`) para `(reporter_id = v_caller_id, message_id = p_message_id)` via join com `reported_message_snapshots` sob lock da mensagem (`FOR UPDATE` ou `FOR SHARE` + índice único / verificação atômica) antes de criar novo snapshot, ou reutilizar/bloquear com `23505`.
- **Teste necessário:** Participante chama `report_direct_message(v_msg_id, ...)` duas vezes; segunda chamada deve falhar com `unique_violation` (`23505`) sem criar segundo snapshot.

### 2. `AUD-SEC-02` — Moderador pode advertir/revogar outro moderador e auto-revogar advertência
- **Gravidade:** `MEDIUM` (Risco potencial de autorização / inconsistência com especificação)
- **Arquivo / Objeto:** `PROPOSED-SOCIAL-MIGRATION.sql` — `public.issue_user_warning` (L491-494) e `public.revoke_user_warning` (L587-600).
- **Cenário de falha:** As funções validam apenas `v_target_role = 'admin' and v_caller_role <> 'admin'`. Um `moderator` pode emitir ou revogar advertência contra outro `moderator`, e em `revoke_user_warning` não há checagem `v_target_id = v_caller_id` nem lock `for share of p nowait` em `profiles`.
- **Impacto:** Quebra de hierarquia documentada e possibilidade de auto-revogação caso um moderador possua advertência ativa.
- **Evidência:** L491-494 e L587-600 de `PROPOSED-SOCIAL-MIGRATION.sql`.
- **Correção recomendada:** Restringir `v_target_role in ('admin', 'moderator') and v_caller_role <> 'admin'`, bloquear `v_target_id = v_caller_id` em `revoke_user_warning` e aplicar `for share of p nowait`.
- **Teste necessário:** Testar `moderator` tentando advertir/revogar outro `moderator` e tentando revogar advertência própria (`42501`).

### 3. `AUD-SEC-03` — Falta filtro `status = 'published'` em `direct_messages_select` e RPC para `last_read_at`
- **Gravidade:** `LOW` (Defeito funcional / integridade)
- **Arquivo / Objeto:** `PROPOSED-SOCIAL-MIGRATION.sql` — `direct_messages_select` (L993-998) e `direct_conversation_members` (L148-156, L983).
- **Correção recomendada:** Filtrar `status = 'published'` em `direct_messages_select` e adicionar RPC `mark_dm_conversation_read(p_conversation_id uuid)` para atualizar `last_read_at`.
- **Teste necessário:** Marcar DM como `hidden`/`removed` e confirmar ocultação; chamar `mark_dm_conversation_read` como participante e como terceiro.

### 4. `AUD-SEC-04` — Índice de rate limit ausente em `direct_messages`
- **Gravidade:** `LOW` (Melhoria recomendada de performance/concorrência)
- **Arquivo / Objeto:** `PROPOSED-SOCIAL-MIGRATION.sql` — `send_direct_message` (L739-745).
- **Correção recomendada:** Adicionar índice `direct_messages_sender_recent_idx on public.direct_messages (sender_id, created_at desc)`.
- **Teste necessário:** Verificar `EXPLAIN` e envio de 31ª DM no mesmo minuto retornando `42901`.

### 5. `AUD-SEC-05` — Divergência documental na Fase A e cobertura de testes
- **Gravidade:** `LOW` (Limitação de teste / documentação)
- **Arquivo / Objeto:** Docs da Fase A (`CORRECTED-ARCHITECTURE.md`, `CORRECTION-AUD-05-08.md`, `TEST-RESULTS.md`) e `run-isolated-pg-tests.sql`.
- **Correção recomendada:** Alinhar nomes (`topic_votes`, `reported_message_snapshots`, `notify_mentions`) e adicionar testes explícitos de `UPDATE`/`DELETE` em `reported_message_snapshots` e colisão `55P03` (`NOWAIT`).

### 6. `AUD-INFO-01` — Compatibilidade PostgreSQL 17.11 apenas por análise estática
- **Gravidade:** `INFORMATIONAL` (Limitação ambiental)
- **Correção recomendada:** Validar a migration revisada em instância PostgreSQL 17.11 antes de aplicar em produção.

### 7. `AUD-INFO-02` — Causa real das regressões `9.1` e `9.7-2a`
- **Gravidade:** `INFORMATIONAL` (Teste desatualizado)
- **Detalhes:** Ambos `test-supabase-infra-etapa9-1.mjs` e `test-research-backend-etapa9-7-2a.mjs` falham por asserções desatualizadas em relação à evolução do próprio repositório (5 migrations vs 3; mock `assert.equal(table, "profiles")` vs `research_submissions`).
