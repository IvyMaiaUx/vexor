# Etapa 9.1.10 — RLS Policies Audit (Fase C)

- **Data:** 2026-11-13
- **Método:** Consulta read-only em `pg_class` (`relrowsecurity`, `relforcerowsecurity`) e `pg_policies` no banco remoto.
- **Status:** `VERIFIED_REMOTE`

## 1. Estado de RLS (`pg_class`)

Todas as 12 tabelas de `public`, além de `storage.buckets` e `storage.objects`, estão com **`relrowsecurity = true`** (`relforcerowsecurity = false`, padrão esperado para que funções `SECURITY DEFINER` e `service_role` operem corretamente).

## 2. Policies por tabela (`pg_policies`)

### `profiles`
- `profiles_select_own_or_mod` (`SELECT`, `authenticated`): `USING ((id = (SELECT auth.uid())) OR (SELECT is_moderator()))` — **sem** policy `SELECT` para `anon`.
- `profiles_update_own` (`UPDATE`, `authenticated`): `USING` e `WITH CHECK` exigem `(id = (SELECT auth.uid())) AND (SELECT is_active_member())`. Proteção adicional de `role` e `is_suspended` garantida por `COLUMN ACL` (sem `UPDATE` nessas colunas).

### `resources`
- `resources_select` (`SELECT`, `anon, authenticated`): `(status = 'approved') OR (submitted_by = (SELECT auth.uid())) OR (SELECT is_moderator())`.
- `resources_insert_member` (`INSERT`, `authenticated`): exige `is_active_member()`, `submitted_by = auth.uid()`, `status = 'pending'`, e categoria ativa de escopo `resource`/`both`.
- `resources_update_owner` (`UPDATE`, `authenticated`): dono ativo apenas enquanto `status IN ('pending', 'rejected')`.
- `resources_update_moderator` (`UPDATE`, `authenticated`): `is_moderator()`.
- `resources_delete_owner_pending` (`DELETE`, `authenticated`): dono ativo apenas se `status = 'pending'`.
- `resources_delete_admin` (`DELETE`, `authenticated`): `is_admin()`.

### `topics` e `posts`
- `topics_select` (`SELECT`, `anon, authenticated`): `(status = 'published') OR (author_id = auth.uid()) OR is_moderator()`.
- `topics_insert_member` (`INSERT`, `authenticated`): `is_active_member()`, `author_id = auth.uid()`, `status = 'published'`, categoria ativa `forum`/`both`.
- `topics_update_owner` / `topics_update_moderator` (`UPDATE`, `authenticated`).
- `topics_delete_owner_unanswered` (`DELETE`, `authenticated`): autor ativo, `published`, `NOT is_locked`, `NOT topic_has_replies(id)`.
- `topics_delete_admin` (`DELETE`, `authenticated`): `is_admin()`.
- `posts_select` (`SELECT`, `anon, authenticated`): `(status = 'published' AND EXISTS topic)` OR `author_id = auth.uid()` OR `is_moderator()`.
- `posts_insert_member` (`INSERT`, `authenticated`): `is_active_member()`, `author_id = auth.uid()`, `status = 'published'`, tópico publicado e (`NOT is_locked` ou `is_moderator()`).
- `posts_update_owner` / `posts_delete_owner` / `posts_delete_admin` (`authenticated`).

### `votes`, `bookmarks`, `notifications`, `reports`, `categories`, `tags`, `topic_tags`, `audit_logs`
- `votes`: `votes_select_own`, `votes_insert` (impede auto-voto com `p.author_id IS DISTINCT FROM auth.uid()`, exige post `published` e `is_active_member()`), `votes_delete_own`.
- `bookmarks`: `bookmarks_select_own`, `bookmarks_insert` (recurso `approved`), `bookmarks_delete_own`.
- `notifications`: `notifications_select_own`, `notifications_update_own`, `notifications_delete_own` (sem policy de `INSERT` para clientes).
- `reports`: `reports_select` (relator ou `is_moderator()`), `reports_insert` (`reporter_id = auth.uid()`, `is_active_member()`, `status = 'open'`). Sem `UPDATE`/`DELETE` direto por clientes.
- `categories`: `categories_select` (`is_active OR is_admin()`), `categories_insert_admin`/`update`/`delete` (`is_admin()`).
- `tags`: `tags_select` (`true`), `tags_insert_member` (`is_active_member()`), `tags_update_moderator`/`delete` (`is_moderator()`).
- `topic_tags`: `topic_tags_select`, `topic_tags_insert`, `topic_tags_delete`.
- `audit_logs`: apenas `audit_logs_select_admin` (`SELECT` para `authenticated` quando `is_admin()`). Nenhuma policy de `INSERT`, `UPDATE` ou `DELETE`.

## 3. Nota de teste funcional

A estrutura e expressões das policies estão 100% `VERIFIED_REMOTE`. O comportamento em tempo de execução sob sessões simuladas com escrita não foi re-executado no remoto por restrição da etapa (`NOT_VERIFIED_WITHOUT_WRITE_TEST`), já tendo sido validado em banco isolado na Etapa 9.1.6/9.1.6.1.
