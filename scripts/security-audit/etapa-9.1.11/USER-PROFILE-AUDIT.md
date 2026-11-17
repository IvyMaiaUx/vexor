# Etapa 9.1.11 — User Profile Audit

- **Data:** 2026-11-13
- **Arquivos analisados:** `src/features/auth/use-auth-store.ts`, `src/features/auth/validation.ts`, `src/app/profile/page.tsx`, `src/app/profile/[username]/page.tsx`, `src/features/profile/profile-edit-modal.tsx`, `src/features/admin/services/admin-service.ts`.

## 1. Situação atual das consultas de perfil

- Atualmente **não existe nenhuma consulta real** ao Supabase (`public.profiles` ou `public.public_profiles`).
- `useAuthStore` mantém `DEMO_PROFILES` e `cybersec_registered_users` no `localStorage`, misturando dados de perfil público com `email`, `role` e `isSuspended` no mesmo objeto client-side (`AuthUserProfile`).
- `src/app/profile/[username]/page.tsx` busca perfis públicos via `getProfileByUsername(username)` em memória local.
- `src/features/profile/profile-edit-modal.tsx` atualiza `localStorage` via `updateProfile()`.

## 2. Alinhamento necessário com o schema remoto (`profiles` e `public_profiles`)

1. **Perfil próprio autenticado:** Consultar `public.profiles` (`eq('id', user.id).single()`), que permite leitura de `role` e `is_suspended` apenas para o próprio usuário (ou moderadores) via RLS `profiles_select_own_or_mod`. O `email` vem de `auth.users` (`user.email`), nunca de `public.profiles`.
2. **Perfis públicos (`/profile/[username]` e autoria em fórum/catálogo):** Consultar exclusivamente a view `public.public_profiles`, que omite `role`, `is_suspended` e `updated_at` e filtra contas suspensas.
3. **Edição de perfil (`ProfileEditModal`):** Executar `UPDATE` em `public.profiles` enviando apenas as 8 colunas permitidas pelo `COLUMN ACL` (`username`, `display_name`, `avatar_url`, `bio`, `interests`, `github_url`, `linkedin_url`, `preferred_locale`).
4. **Criação pós-cadastro:** Confiar exclusivamente no trigger `on_auth_user_created` (`handle_new_user()`), sem `INSERT` manual em `public.profiles` no frontend.
5. **Incompatibilidade de validação detectada:** Em `src/features/auth/validation.ts` linha 79, `validateRegistrationInput` permite `displayName` até `80` caracteres, enquanto a constraint `profiles_display_name_len` no PostgreSQL limita a `60` caracteres.
