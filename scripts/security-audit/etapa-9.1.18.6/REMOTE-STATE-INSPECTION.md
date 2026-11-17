# Inspeção do Estado Remoto (Somente Leitura) — Etapa 9.1.18.6

## 1. Identificação do Projeto e Migrations
- **Projeto Supabase:** `Vexor` (`zcjudcbckcxwnfnrjfte`, ambiente `production`).
- **Histórico remoto (`npx supabase migration list --remote`):** todas as 4 migrations oficiais estão aplicadas e sincronizadas (`local === remote`):
  - `20261110000001` (`2026-11-10 00:00:01`) — schema base (`public.profiles` e demais tabelas)
  - `20261110000002` (`2026-11-10 00:00:02`) — funções e triggers (`handle_new_user()`, `on_auth_user_created`)
  - `20261110000003` (`2026-11-10 00:00:03`) — RLS e privilégios em nível de coluna
  - `20261113143000` (`2026-11-13 14:30:00`) — hardening de segurança (V1–V5, incluindo remoção de `SELECT` de `anon` em `public.profiles` e criação de `public.public_profiles`)

## 2. Estrutura de `public.profiles` (Consulta Remota)
Colunas confirmadas em `information_schema.columns`:
`id` (`uuid`, PK FK -> `auth.users.id`), `username` (`text`), `display_name` (`text`), `avatar_url` (`text`), `bio` (`text`), `interests` (`text[]`), `github_url` (`text`), `linkedin_url` (`text`), `preferred_locale` (`text`, default `'en'`), `role` (`user_role`, default `'member'`), `is_suspended` (`boolean`, default `false`), `created_at` (`timestamptz`), `updated_at` (`timestamptz`).

## 3. RLS, Policies e Privilégios (Consulta Remota em `pg_class`, `pg_policies`, `pg_attribute`)
- **RLS em `public.profiles`:** `relrowsecurity = true`, `relforcerowsecurity = false`.
- **Policies em `public.profiles`:**
  - `profiles_select_own_or_mod` (`SELECT`, `authenticated`): `(id = (SELECT auth.uid())) OR (SELECT is_moderator())`
  - `profiles_update_own` (`UPDATE`, `authenticated`): `USING` e `WITH CHECK` = `(id = (SELECT auth.uid())) AND (SELECT is_active_member())`
- **Privilégios em nível de tabela (`pg_class.relacl`):**
  - `anon`: nenhum privilégio em `public.profiles`; apenas `SELECT` em `public.public_profiles`.
  - `authenticated`: `SELECT` em `public.profiles` e `SELECT` em `public.public_profiles`; nenhum `INSERT` nem `DELETE` em `public.profiles`.
- **Privilégios de `UPDATE` em nível de coluna (`pg_attribute.attacl` para `authenticated`):**
  - Permitidas: `username`, `display_name`, `avatar_url`, `bio`, `interests`, `github_url`, `linkedin_url`, `preferred_locale`.
  - **Excluídas (sem `UPDATE`):** `role`, `is_suspended`, `id`, `created_at`, `updated_at`.

## 4. Triggers e `handle_new_user()` (Consulta Remota em `pg_trigger` e `pg_get_functiondef`)
- `auth.users`: trigger `on_auth_user_created` -> `public.handle_new_user()` (`SECURITY DEFINER`, `SET search_path TO ''`).
  - Lê `username` e `display_name` de `raw_user_meta_data` com fallback `user_<12 hex>` e insere em `public.profiles (id, username, display_name)` com `id = new.id` e valores default do schema (`role = 'member'`, `is_suspended = false`).
- `public.profiles`: triggers `profiles_protect_last_admin_delete` (`SECURITY DEFINER`) e `profiles_set_updated_at`.

## 5. Estado Atual das Contas e Separação de Evidências
- **Contagem remota (`auth.users` vs `public.profiles`):** `total_users = 1`, `confirmed_users = 1`, `total_profiles = 1`, `users_without_profile = 0`.
- **Perfil existente:** 1 conta com `role = 'admin'` e `is_suspended = false` (e-mail omitido por segurança).
- **Separação de evidências:**
  - *Evidência estática:* migrations SQL e serviços TS (`profile-service.ts`, `register-service.ts`).
  - *Evidência por consulta ao banco:* esquema, RLS, ACLs de coluna, triggers e paridade `auth.users` = `profiles` confirmados no projeto remoto `zcjudcbckcxwnfnrjfte`.
  - *Evidência por testes automatizados:* 7 suítes Node offline + 13 testes Playwright (sem escrita no banco remoto).
  - *Comportamento ainda não comprovado em runtime remoto:* execução real via cliente Supabase autenticado como usuário comum (`member`) tentando `UPDATE` em `role`/`is_suspended`, `UPDATE` permitido com restauração, e criação automática de perfil pelo trigger `on_auth_user_created` em novo cadastro isolado.
