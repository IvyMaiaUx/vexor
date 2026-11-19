# REVISÃO GERAL DE SEGURANÇA DO SQL (`PROPOSED-SOCIAL-MIGRATION.sql`)

## 1. Análise das Funções `SECURITY DEFINER`
Todas as funções `SECURITY DEFINER` do arquivo definem explicitamente `set search_path = ''` e qualificam objetos com `public.` ou `pg_catalog.`:

| Função | `search_path = ''` | Valida `auth.uid()` | Valida Suspensão / Papel | `EXECUTE` Restrito | Observações |
|---|---|---|---|---|---|
| `is_dm_participant(uuid)` | Sim (L234) | Sim (`auth.uid() is not null`) | N/A (helper booleano) | `authenticated` apenas | Seguro contra enumeração de terceiros. |
| `on_topic_vote_changed()` | Sim (L252) | Trigger | Trigger | Revogado de `public, anon, authenticated` | `exception when others then null` protege voto. |
| `on_vote_changed()` | Sim (L299) | Trigger | Trigger | Já revogado na migration 3 | Preserva compatibilidade com `posts.vote_count`. |
| `notify_mentions(...)` | Sim (L347) | Chamada por trigger | Filtra `not p.is_suspended` | Revogado de `public, anon, authenticated` | Sem SQL injection (query parametrizada). |
| `on_topic_created_mentions()` | Sim (L396) | Trigger | `new.status = 'published'` | Revogado de `public, anon, authenticated` | Seguro. |
| `on_post_created()` | Sim (L415) | Trigger | Trigger | Já revogado na migration 3 | Mantém notificação de `topic_reply` + `notify_mentions`. |
| `issue_user_warning(...)` | Sim (L450) | Sim | `is_moderator()` + pós-lock `for share nowait` | `authenticated` | Ver `AUD-SEC-02` (mod vs mod). |
| `acknowledge_user_warning(uuid)` | Sim (L530) | Sim | `is_active_member()` + `user_id = v_caller_id` | `authenticated` | Seguro. |
| `revoke_user_warning(...)` | Sim (L559) | Sim | `is_moderator()` + pós-lock `for share nowait` | `authenticated` | Ver `AUD-SEC-02` (mod vs mod / auto-revogação). |
| `get_or_create_dm_conversation(uuid)` | Sim (L630) | Sim | `is_suspended` em caller e target (`for share nowait`) | `authenticated` | Advisory lock no par canônico evita corrida. |
| `send_direct_message(...)` | Sim (L691) | Sim | `is_suspended` em caller + participação + `user_blocks` | `authenticated` | Ver `AUD-SEC-04` (índice de rate limit). |
| `report_direct_message(...)` | Sim (L779) | Sim | `is_suspended` em caller + participação | `authenticated` | Ver `AUD-SEC-01` (dedupe de snapshot). |
| `get_reported_message_evidence(uuid)` | Sim (L843) | Sim | `is_moderator()` + pós-lock `role`/`is_suspended` | `authenticated` | Grava `write_audit_log('dm.evidence_viewed', ...)`. |

## 2. Integridade Referencial e Constraints
- `topics.shared_url`: validado com regex `^https?://[^[:space:]]+$` e `<= 2048` chars (bloqueia `javascript:` e `data:`).
- `direct_conversations`: `participant_low < participant_high` + `UNIQUE (participant_low, participant_high)` garante unicidade 1:1.
- `user_blocks`: `blocker_id <> blocked_id`.
- `user_warnings`: `description` entre `10` e `1500` chars; `revocation_reason >= 5` quando `status = 'revoked'`.
- `direct_messages`: `body` entre `1` e `4000` chars.
- `reported_message_snapshots`: sem FK `ON DELETE CASCADE` para `direct_messages`, garantindo preservação mesmo se a mensagem for apagada.
