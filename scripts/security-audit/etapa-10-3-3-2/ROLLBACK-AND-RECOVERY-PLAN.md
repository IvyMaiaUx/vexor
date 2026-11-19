# PLANO DE ROLLBACK E RECUPERAÇÃO — ETAPA 10.3.3.2

> **AVISO CRÍTICO (SUPABASE FREE):** O projeto `Vexor` (`zcjudcbckcxwnfnrjfte`) **não possui PITR habilitado**. Não existe recuperação automática ponto a ponto. Qualquer reversão destrutiva após dados reais pode exigir reconstrução manual. **Este documento é exclusivamente um plano técnico — nenhum rollback foi executado.**

## 1. Inventário de Objetos Criados ou Alterados
- **ENUM `public.notification_type`:** valores adicionados (`topic_upvoted`, `post_upvoted`, `post_reply`, `mention`, `direct_message`, `user_warning`, `content_hidden`, `content_removed`). **Limitação PG 17:** valores de ENUM **não podem ser removidos** com `ALTER TYPE ... DROP VALUE` sem recriar o tipo.
- **Novos ENUMs:** `topic_kind`, `warning_severity`, `warning_status`.
- **Colunas em tabelas existentes:**
  - `topics`: `kind`, `shared_url`, `resource_id`, `vote_count` + `topics_timeline_keyset_idx`, `topics_kind_keyset_idx`.
  - `reports`: `message_snapshot_id`, `message_id` + `reports_dm_message_id_pair`, `reports_dedupe_direct_message_active`, `reports_one_target` atualizada.
  - `notifications`: `conversation_id`, `message_id`, `warning_id`, `metadata`.
- **Novas tabelas:** `topic_votes`, `user_blocks`, `user_warnings`, `direct_conversations`, `direct_conversation_members`, `direct_messages`, `reported_message_snapshots`.
- **Funções / Triggers / Policies / Grants:** `is_dm_participant`, `on_topic_vote_changed`, `on_vote_changed` (atualizada), `notify_mentions`, `on_topic_created_mentions`, `on_post_created` (atualizada), `issue_user_warning`, `acknowledge_user_warning`, `revoke_user_warning`, `get_or_create_dm_conversation`, `send_direct_message`, `report_direct_message`, `get_reported_message_evidence`, `mark_dm_conversation_read`; `REVOKE SELECT ... FROM anon` e recriação de `topics_select`, `posts_select`, `resources_select` para `authenticated`.

## 2. Estratégia por Cenário

### Cenário A — Rollback Técnico ANTES de Receber Dados Reais (Janela Imediata / Falha Pós-Deploy)
Se nenhum dado real de usuário tiver sido gravado nas novas tabelas:
1. Restaurar `on_vote_changed()`, `on_post_created()`, `topics_select`, `posts_select`, `resources_select` e `GRANT SELECT ... TO anon` (se necessário para compatibilidade temporária) conforme migrations `20261110000002` e `20261110000003`.
2. Remover triggers (`topic_votes_after_change`, `topics_after_insert_mentions`) e RPCs sociais.
3. Remover colunas em `notifications`, `reports` (restaurando `reports_one_target` anterior) e `topics`.
4. Remover tabelas em ordem reversa de dependência: `reported_message_snapshots` → `direct_messages` → `direct_conversation_members` → `direct_conversations` → `user_warnings` → `user_blocks` → `topic_votes`.
5. Remover novos tipos (`warning_status`, `warning_severity`, `topic_kind`). Os valores adicionados em `notification_type` permanecem inócuos.

### Cenário B — Recuperação APÓS Receber Dados Reais
- **NÃO executar `DROP TABLE` nem `DROP COLUMN` destrutivo.**
- Remover `reported_message_snapshots`, `user_warnings`, `direct_messages` ou `reports` destruiria evidências legais/de moderação, histórico de advertências e auditoria (`audit_logs`).
- Se for necessário desativar temporariamente a feature em produção: **revogar `EXECUTE` das RPCs sociais de `authenticated` e restringir acesso na camada Next.js**, preservando integralmente os dados em repouso.

### Cenário C — Correção Forward-Only (Padrão Recomendado)
- Qualquer defeito funcional após a aplicação deve ser corrigido por uma **nova migration incremental forward-only** (`CREATE OR REPLACE FUNCTION`, `ALTER TABLE ...`, `CREATE INDEX ...`), nunca apagando tabelas ou evidências.

### Cenário D — Falha Parcial Durante `db push`
- Como os `ALTER TYPE ... ADD VALUE IF NOT EXISTS` ficam fora do `BEGIN; ... COMMIT;`, se o bloco transacional principal (`BEGIN; ... COMMIT;`) falhar, **nenhuma tabela, função ou policy será criada parcialmente** (tudo dentro de `BEGIN ... COMMIT` sofre rollback atômico). Restarão apenas valores idempotentes em `notification_type`, permitindo corrigir o erro e reexecutar com segurança.
