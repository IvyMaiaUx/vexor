# Etapa 9.1.17 — Implementação do Serviço de Perfil (`profile-service.ts`)

**Arquivo criado:** `src/features/profile/profile-service.ts`  
**Schema consultado:** `src/types/database.types.ts` + migrations `20261110000001_schema.sql`, `20261110000003_rls_and_grants.sql`, `20261113143000_security_hardening.sql`.

---

## 1. Funções Implementadas

1. `readOwnProfile(options?)`:
   - Valida identidade via `supabase.auth.getUser()`.
   - Consulta `public.profiles` filtrando por `id = user.id` (`maybeSingle()`).
   - Confirma `row.id === user.id`.
   - **Nunca** cria perfil manualmente (responsabilidade exclusiva do trigger `handle_new_user()`).
   - Retorna estados explícitos: `"authenticated"`, `"suspended"`, `"unauthenticated"`, `"profile_missing"`, `"connection_error"`.

2. `readPublicProfileByUsername(username, options?)`:
   - Consulta exclusivamente a view `public.public_profiles` (que omite `role` e `is_suspended` e oculta perfis suspensos para não-moderadores).
   - Retorna `"found"`, `"not_found"` ou `"connection_error"`.

3. `updateOwnProfile(input, options)`:
   - Bloqueia imediatamente (`forbidden_field`) qualquer payload contendo `id`, `role`, `is_suspended`, `isSuspended`, `created_at`, `createdAt`, `updated_at`, `updatedAt`.
   - Valida os campos editáveis via `validateProfileUpdate()` (incluindo `username` opcional com `USERNAME_REGEX`).
   - Constrói allowlist estrita com **apenas** as 8 colunas com `GRANT UPDATE` na migration:
     `username`, `display_name`, `avatar_url`, `bio`, `interests`, `github_url`, `linkedin_url`, `preferred_locale`.
   - Verifica `supabase.auth.getUser()` (e `expectedUserId === user.id`).
   - Executa `.from("profiles").update(sanitizedUpdate).eq("id", user.id).select(...).maybeSingle()`.
   - Trata `username_taken` (`23505`), `rls_denied` (`42501`/`403`/row `null`), `validation_error` (`23514`), `connection_error` e `update_failed`.
