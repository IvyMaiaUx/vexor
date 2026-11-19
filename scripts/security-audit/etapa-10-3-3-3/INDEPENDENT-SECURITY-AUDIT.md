# AUDITORIA INDEPENDENTE DE SEGURANÇA — ETAPA 10.3.3.3

## Revalidação Completa sobre `20261117234500_social_community.sql`
- **RLS:** `is_dm_participant(uuid)` (`SECURITY DEFINER`, `STABLE`, `SET search_path = ''`, `auth.uid()`) evita recursão `42P17`; `anon` bloqueado (`REVOKE SELECT`) em `topics`, `posts`, `resources`, `categories`, `tags`, `topic_tags` e sem acesso às 7 novas tabelas; usuários suspensos bloqueados em `topic_votes`, `user_blocks`, `direct_messages`, `mark_dm_conversation_read`, `send_direct_message`, `report_direct_message`, `get_or_create_dm_conversation`, `issue_user_warning`, `revoke_user_warning`.
- **Moderação & Hierarquia:** `admin > moderator > member`; anti-auto-advertência e anti-auto-revogação; revalidação pós-lock com `pg_advisory_xact_lock(6216471958360507469)`; `audit_logs` preservados.
- **DMs, Evidências & Fórum:** `direct_messages_select` filtra `status = 'published'`; `report_direct_message` exige `dm.status = 'published'` e deduplica via `reports_dedupe_direct_message_active` (`23505`, zero snapshot órfão); `reported_message_snapshots` imutável e acessível apenas via `get_reported_message_evidence(uuid)` com log; `topics.title` `NOT NULL` (`5..200`); keyset `(created_at, id)`; menções limitadas a 10 respeitando `user_blocks`.

## Achados Classificados
- **CRITICAL:** 0
- **HIGH:** 0
- **MEDIUM:** 0
- **LOW:** 0
- **INFORMATIONAL:** 3 (`AUD-FINAL-INFO-01` PG 17.11 runtime pendente; `AUD-FINAL-INFO-02` Realtime WebSocket pendente para Fase B; `AUD-FINAL-INFO-03` mapeamento HTTP de SQLSTATEs + ausência de PITR no Supabase Free). Nenhum impede a aplicação quando autorizada.
