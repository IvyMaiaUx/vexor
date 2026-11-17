# VEXOR — Etapa 9.0: Dependências de RLS, Grants e Segurança de Banco

Baseado na inspeção direta de `supabase/migrations/20261110000003_rls_and_grants.sql` e `20261110000002_functions_triggers.sql`.

---

## 1. Modelo de Privilégios Mínimos (`20261110000003_rls_and_grants.sql`)

O banco adota **default-deny**:
- `revoke all on all tables in schema public from anon, authenticated;`
- `revoke all on all sequences in schema public from anon, authenticated;`
- `alter default privileges in schema public revoke all on tables from anon, authenticated;`
- Apenas colunas estritamente permitidas recebem `grant insert (...)` / `grant update (...)` para `authenticated`.
- Todas as funções `SECURITY DEFINER` utilizam `set search_path = ''` e nomes totalmente qualificados.
- Funções internas de trigger e `write_audit_log` têm execução revogada de `public`, `anon` e `authenticated`.
- As 8 RPCs administrativas/de moderação e de fluxo (`admin_set_user_role`, `admin_set_user_suspension`, `moderate_resource`, `resubmit_resource`, `moderate_topic`, `moderate_post`, `resolve_report`, `set_accepted_post`) têm `revoke all ... from public, anon` e `grant execute ... to authenticated`, delegando a checagem de papel/propriedade para dentro da própria função `SECURITY DEFINER`.

---

## 2. Mapeamento de Políticas RLS por Tabela

| Tabela | `SELECT` | `INSERT` | `UPDATE` | `DELETE` |
| --- | --- | --- | --- | --- |
| `profiles` | `profiles_select_public` | Via trigger `handle_new_user()` | `profiles_update_own` (apenas colunas não sensíveis via grant) | Via cascade de `auth.users` |
| `categories` | `categories_select` | `categories_insert_admin` | `categories_update_admin` | `categories_delete_admin` |
| `resources` | `resources_select` | `resources_insert_member` | `resources_update_owner`, `resources_update_moderator` | `resources_delete_owner_pending`, `resources_delete_admin` |
| `topics` | `topics_select` | `topics_insert_member` | `topics_update_owner`, `topics_update_moderator` | `topics_delete_owner_unanswered`, `topics_delete_admin` |
| `posts` | `posts_select` | `posts_insert_member` | `posts_update_owner` | `posts_delete_owner`, `posts_delete_admin` |
| `tags` | `tags_select` | `tags_insert_member` | `tags_update_moderator` | `tags_delete_moderator` |
| `topic_tags` | `topic_tags_select` | `topic_tags_insert` | — | `topic_tags_delete` |
| `votes` | `votes_select_own` | `votes_insert` | — | `votes_delete_own` |
| `bookmarks` | `bookmarks_select_own` | `bookmarks_insert` | — | `bookmarks_delete_own` |
| `reports` | `reports_select` | `reports_insert` | Via RPC `resolve_report` | — |
| `notifications` | `notifications_select_own` | Via triggers/sistema | `notifications_update_own` (`read_at` apenas) | `notifications_delete_own` |
| `audit_logs` | `audit_logs_select_admin` | Via `write_audit_log` (`SECURITY DEFINER`) | Bloqueado por `audit_logs_block_mutation()` | Bloqueado por `audit_logs_block_mutation()` |

### Storage (`storage.objects`)
- Bucket `avatars`: políticas `avatars_insert_own`, `avatars_update_own`, `avatars_delete_own` restringem escrita ao próprio usuário.

---

## 3. Dependências Críticas para a Integração (Etapas 9.1+)

1. **Usuário suspenso (`is_suspended = true`):** políticas de escrita de membros usam helpers como `is_active_member()`. A UI deve tratar erros `42501` / RLS denied graciosamente quando um usuário suspenso tentar criar recurso, tópico, post, voto ou bookmark.
2. **Moderação e Auditoria obrigatórias via RPC:** o frontend **não** deve tentar `UPDATE` direto em `profiles.role`, `profiles.is_suspended`, `reports.status`, ou colunas administrativas de `resources`/`topics`/`posts`, pois os `grant update (...)` bloqueiam essas colunas. Toda operação administrativa precisa passar pelas RPCs `SECURITY DEFINER`, que também garantem o registro imutável em `audit_logs`.
3. **Separação `admin` vs `moderator`:**
   - `AdminLayout` (`src/app/admin/layout.tsx`) libera entrada para `requireServerAuthorization("moderator")` (ou seja, `moderator` e `admin`).
   - Porém `audit_logs_select_admin`, `categories_*_admin`, `admin_set_user_role` e `admin_set_user_suspension` exigem `admin`. Ao integrar `/admin/audit`, `/admin/users` e ações exclusivas de admin, o frontend e as páginas devem respeitar essa distinção para não expor ações que falharão no RLS ou exibir telas vazias sem feedback claro.
4. **Contadores e campos derivados:** `resources` (slug), `posts` (contadores de respostas) e `votes` (contadores) são mantidos por triggers (`resources_set_slug`, `on_post_created`, `on_vote_changed`). O cliente não deve enviar esses campos no `INSERT`/`UPDATE`.
5. **Reaproveitamento da conta de teste:** testes reais de RLS não devem usar `service_role` em código da aplicação e devem preservar intacta a conta `admin` real, usando uma conta dedicada `member` (e futuramente `moderator` se necessário) com limpeza controlada.
