# REVISÃO DE RLS E PRIVILÉGIOS

## 1. Matriz de Privilégios das Novas Tabelas

| Tabela | RLS Habilitada | `anon` | `authenticated` | Observação |
|---|---|---|---|---|
| `public.topic_votes` | Sim (L891) | Nenhum (`REVOKE ALL`) | `SELECT` (próprio), `INSERT (topic_id)` (ativo, tópico `published`), `DELETE` (próprio, ativo) | Suspensos bloqueados em `INSERT` e `DELETE` via `is_active_member()`. |
| `public.user_blocks` | Sim (L892) | Nenhum | `SELECT` (próprio), `INSERT (blocked_id)` (ativo, `<> auth.uid()`), `DELETE` (próprio, ativo) | Coluna `blocker_id` usa `DEFAULT auth.uid()`, não aceita spoofing. |
| `public.user_warnings` | Sim (L893) | Nenhum | `SELECT` (`user_id = auth.uid()` ou `is_moderator()`) | Mutações bloqueadas na tabela; exclusivamente via RPCs. |
| `public.direct_conversations` | Sim (L894) | Nenhum | `SELECT` via `is_dm_participant(id)` | Criação apenas via `get_or_create_dm_conversation`. |
| `public.direct_conversation_members` | Sim (L895) | Nenhum | `SELECT` via `is_dm_participant(conversation_id)` | Sem `UPDATE` para `last_read_at` ainda (`AUD-SEC-03`). |
| `public.direct_messages` | Sim (L896) | Nenhum | `SELECT` via `is_active_member() AND is_dm_participant(conversation_id)` | Falta filtro `status = 'published'` (`AUD-SEC-03`). |
| `public.reported_message_snapshots` | Sim (L897) | Nenhum | Nenhum privilégio direto (`REVOKE ALL`) | Leitura exclusiva via `get_reported_message_evidence(uuid)` com log em `audit_logs`. |

## 2. Revogação de `anon` em Tabelas Existentes (`AUD-02`)
- `REVOKE SELECT ON public.topics, public.posts, public.resources, public.categories, public.tags, public.topic_tags FROM anon;` (L905-907).
- `topics_select`, `posts_select` e `resources_select` foram recriadas explicitamente com `TO authenticated` (L909-934).
- **Nota de verificação:** `public_profiles` view (criada em `20261113143000_security_hardening.sql`) não expõe `topics`, `posts` ou `resources`. Nenhum vazamento anônimo foi identificado nas novas RPCs.
