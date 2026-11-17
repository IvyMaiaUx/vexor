# Etapa 9.1.17 — Inventário e Diagnóstico de Integração de Perfil

**Data:** 2026-11-14  
**Regra cumprida:** Levantamento concluído antes de qualquer modificação em `src/`.

---

## 1. Onde o perfil atualmente é obtido
- **Servidor (SSR / API):** `src/lib/supabase/auth.ts` (`resolveServerSessionWithClient()` / `resolveServerSession()`) consulta `supabase.auth.getUser()` e `public.profiles` (`id, username, display_name, avatar_url, bio, interests, github_url, linkedin_url, preferred_locale, role, is_suspended, created_at`). Exposto via `GET /api/auth/session` (`src/app/api/auth/session/route.ts`).
- **Cliente (Sync):** `src/features/auth/session-sync.ts` (`syncClientSessionFromServer()`) consome `GET /api/auth/session` e converte com `mapServerPayloadToProfile()`.
- **Páginas de Perfil atuais (ainda 100% client-side / locais):**
  - `src/app/profile/page.tsx` lê `user` diretamente de `useAuthStore()`.
  - `src/app/profile/[username]/page.tsx` lê `user` e `getProfileByUsername(username)` de `useAuthStore()` (que só busca em `registeredUsers` do `localStorage` + `DEMO_PROFILES`, **não** consulta `public.public_profiles` no Supabase).

## 2. Onde o perfil é armazenado
- **Banco Supabase:** Tabela `public.profiles` (1:1 com `auth.users.id`, criada pelo trigger `public.handle_new_user()`) e view pública `public.public_profiles` (sem `role` e `is_suspended`).
- **Cliente (`localStorage`):** `useAuthStore` persiste `cybersec_auth_session` (perfil atual para UI), `cybersec_auth_mode` (`"supabase"` | `"demo"` | `null`), `cybersec_auth_sync_meta` e `cybersec_registered_users` (apenas para modo local/demo). **Não armazena senha nem tokens JWT.**

## 3. Quais componentes dependem de `DEMO_PROFILES`
- `src/features/auth/use-auth-store.ts` (define `DEMO_PROFILES` e compõe `allProfiles`).
- `src/app/login/page.tsx` (botões rápidos de demonstração para `sec_analyst_br`, `mod_sentinel`, `root_admin`, `suspended_user`).
- `src/features/admin/services/admin-service.ts` (simulador administrativo em memória/`localStorage`).

## 4. Quais componentes dependem de `useAuthStore`
- Autenticação e sessão: `src/components/auth/auth-session-sync.tsx`, `src/components/auth/sign-out-error-banner.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/auth/reset-password/page.tsx`.
- Layout: `src/components/layout/header.tsx`.
- Perfil: `src/app/profile/page.tsx`, `src/app/profile/[username]/page.tsx`, `src/features/profile/profile-edit-modal.tsx`, `src/features/profile/profile-tabs.tsx`.
- Fórum/Catálogo/Contribuições: `src/app/forum/new/page.tsx`, `src/app/forum/[id]/page.tsx`, `src/app/catalog/submit/page.tsx`, `src/app/my-contributions/page.tsx`.
- Admin & Cybercrime Research (com guards server-side já existentes nos layouts): `src/app/admin/**`, `src/features/admin/**`, `src/features/cybercrime-research/**`.

## 5. Quais telas apresentam dados simulados
- `/profile` (`src/app/profile/page.tsx`) e `/profile/[username]` (`src/app/profile/[username]/page.tsx`): estatísticas/tópicos/respostas/contribuições ainda usam stores locais (`useForumStore`, `useCatalogStore`), e `/profile/[username]` atualmente só resolve perfis de `DEMO_PROFILES` / `localStorage`.
- `/login`: possui bloco explícito de contas `DEMO_PROFILES`.
- `/admin/*`: painel administrativo ainda opera com `admin-service.ts` simulado no cliente (protegido por layout server-side).

## 6. Quais funcionalidades permitem editar perfil
- `src/features/profile/profile-edit-modal.tsx` (`ProfileEditModal`), acionado por `ProfileHeader` (`onOpenEdit`) em `/profile` e `/profile/[username]` quando `isCurrentUser === true`.
- **Problema atual:** `ProfileEditModal` chama `updateProfile(profile.id, ...)` de `useAuthStore`, que grava **apenas no `localStorage`** (`cybersec_registered_users` e `cybersec_auth_session`), **sem persistir em `public.profiles` no Supabase**. Além disso, ainda não permite editar `username` (que tem `GRANT UPDATE` na migration) e não exibe erros de persistência/RLS/rede.

## 7. Quais componentes exibem username, avatar, nome e biografia
- `src/features/profile/profile-header.tsx`: exibe `displayName`, `username`, `avatarUrl` (com fallback de iniciais), `role`, `specialty`, `isSuspended` e `createdAt`.
- `src/features/profile/profile-tabs.tsx`: exibe `bio`, `interests`, `githubUrl`, `linkedinUrl`, `preferredLanguage` (na aba Configurações/Visão Geral) e botão `signOut`.
- `src/components/layout/header.tsx`: exibe dados do usuário autenticado (`user`).

## 8. Quais informações são obtidas do `localStorage`
- `cybersec_auth_session` (cache de UI do perfil do usuário).
- `cybersec_auth_mode` (`"supabase"` | `"demo"`).
- `cybersec_auth_sync_meta` (`AuthSyncMeta`).
- `cybersec_registered_users` (usuários locais/demo).
- `cybersec_locale` (idioma da UI).
- Stores de catálogo, fórum e atividade (`useCatalogStore`, `useForumStore`, `useActivityStore`).
- **Observação de segurança:** Nenhuma autorização no servidor depende de `localStorage`; porém no cliente `useAuthStore` ainda lê `user.role` e `user.isSuspended` de `cybersec_auth_session` (que só é confiável quando sincronizado via `GET /api/auth/session` em `authMode === "supabase"`).

## 9. Quais operações já consultam o Supabase
- `src/lib/supabase/auth.ts`: `supabase.auth.getUser()` + `.from("profiles").select(...).eq("id", user.id).maybeSingle()`.
- `src/app/api/auth/session/route.ts` e `src/app/api/auth/logout/route.ts`.
- `src/app/auth/callback/route.ts` (`exchangeCodeForSession`).
- `src/features/auth/login-service.ts`, `register-service.ts`, `recovery-service.ts`.
- **Nenhuma** operação em `src/features/profile/` consulta ou atualiza `public.profiles`, `public.public_profiles` ou `storage.from("avatars")` ainda.

## 10. Páginas: Server Components vs Client Components
- **Podem permanecer Client Components (com dados obtidos via API/serviço autenticado ou props iniciais):**
  - `/profile` (`src/app/profile/page.tsx`) e `/profile/[username]` (`src/app/profile/[username]/page.tsx`) dependem de hooks interativos (`useCatalogStore`, `useForumStore`, modais e abas). A leitura/atualização do perfil real deve ocorrer via serviço dedicado (`src/features/profile/profile-service.ts`) e endpoints server-validated (`GET /api/auth/session`, `GET/PATCH /api/profile` ou cliente Supabase autenticado respeitando RLS), sem quebrar o modo `DEMO_PROFILES` quando `authMode === "demo"`.
- **Layouts/Páginas Server Components existentes:** `src/app/admin/layout.tsx`, `src/app/admin/users/layout.tsx`, `src/app/admin/audit/layout.tsx` e `src/app/cybercrime-research/layout.tsx` já validam sessão e autorização no servidor via `requireServerAuthorization()`.

## 11. Schema real verificado (`database.types.ts` + migrations)
- **Colunas graváveis pelo próprio usuário autenticado (`GRANT UPDATE` em `20261110000003_rls_and_grants.sql`):**
  `username`, `display_name`, `avatar_url`, `bio`, `interests`, `github_url`, `linkedin_url`, `preferred_locale`.
- **Colunas proibidas para edição pelo cliente (sem `GRANT UPDATE`):**
  `id`, `role`, `is_suspended`, `created_at`, `updated_at`.
- **Policy RLS de UPDATE (`profiles_update_own`):** `id = auth.uid() AND public.is_active_member()` (usuários suspensos são bloqueados pelo banco).
- **View pública (`public.public_profiles`):** `security_invoker = false, security_barrier = true`, expõe apenas campos públicos (omite `role` e `is_suspended`, e oculta perfis suspensos para não-moderadores).
- **Storage `avatars`:** bucket público para leitura, limite 2 MB (`2097152` bytes), apenas `image/png`, `image/jpeg`, `image/webp` (SVG bloqueado), gravação/atualização/exclusão restrita a `{auth.uid()}/...` para membros ativos.
