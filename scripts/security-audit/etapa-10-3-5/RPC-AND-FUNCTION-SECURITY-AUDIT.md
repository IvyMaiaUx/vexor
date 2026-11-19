# AUDITORIA DE SEGURANÇA DAS RPCs E FUNÇÕES — ETAPA 10.3.5

Todas as funções sociais da `20261117234500_social_community.sql` definem `SECURITY DEFINER` com `SET search_path = ''`, qualificação explícita (`public.*`, `pg_catalog.*`) e `REVOKE ALL FROM public, anon`:

| Função | Assinatura | `EXECUTE` | Segurança / Locks / Validações |
|---|---|---|---|
| `is_dm_participant` | `(p_conversation_id uuid) -> boolean` | `authenticated` | `STABLE`, usa `auth.uid() is not null`, sem recursão RLS (`42P17`). |
| `get_or_create_dm_conversation` | `(p_other_user_id uuid) -> uuid` | `authenticated` | Advisory lock par ordenado, `profiles FOR SHARE NOWAIT` (caller/target `not is_suspended`), checa `user_blocks`. |
| `send_direct_message` | `(p_conversation_id uuid, p_body text) -> uuid` | `authenticated` | `profiles FOR SHARE NOWAIT`, `direct_conversations FOR NO KEY UPDATE`, `pg_advisory_xact_lock('dm_rate:' || v_caller_id)` (`30/min`, `42901`), checa participação e `user_blocks`, `greatest(last_message_at, now())`. |
| `mark_dm_conversation_read` | `(p_conversation_id uuid) -> timestamptz` | `authenticated` | `profiles FOR SHARE NOWAIT`, `is_dm_participant` (`42501` uniforme), atualiza somente `last_read_at` do próprio usuário. |
| `report_direct_message` | `(p_message_id uuid, p_reason report_reason, p_details text) -> uuid` | `authenticated` | `profiles FOR SHARE NOWAIT`, `dm.status = 'published'` (`FOR SHARE NOWAIT`, `P0002` uniforme), checa participação, bloqueia duplicata ativa (`23505`) antes de criar snapshot. |
| `get_reported_message_evidence` | `(p_report_id uuid) -> table(...)` | `authenticated` | `is_moderator()`, `profiles FOR SHARE NOWAIT` (`role in ('moderator','admin')` e `not is_suspended`), grava `audit_logs` (`dm.evidence_viewed`). |
| `issue_user_warning` | `(p_user_id, p_reason, p_severity, p_description, ...) -> uuid` | `authenticated` | `pg_advisory_xact_lock(6216471958360507469)`, `profiles` caller (`FOR SHARE NOWAIT`) e target (`FOR UPDATE NOWAIT`), hierarquia `admin > moderator > member`, grava `notifications` e `audit_logs`. |
| `acknowledge_user_warning` | `(p_warning_id uuid) -> void` | `authenticated` | `is_active_member()`, atualiza apenas própria advertência `active`. |
| `revoke_user_warning` | `(p_warning_id uuid, p_reason text) -> void` | `authenticated` | `pg_advisory_xact_lock(6216471958360507469)`, caller `FOR SHARE NOWAIT`, warning `FOR UPDATE OF w NOWAIT`, target `FOR SHARE NOWAIT`, bloqueia auto-revogação e `mod -> mod/admin`, grava `audit_logs`. |
| Triggers internos | `on_topic_vote_changed`, `on_vote_changed`, `notify_mentions`, `on_topic_created_mentions`, `on_post_created` | Revogado de `public, anon, authenticated` | `on_topic_vote_changed`/`on_vote_changed` protegem voto com `exception when others then null`; `notify_mentions` limita a 10 handles respeitando `user_blocks` e `not is_suspended`. |

- **Divergência entre Revisão 3 e banco remoto:** **Nenhuma** (SQL 100% equivalente aplicado atomicamente).
