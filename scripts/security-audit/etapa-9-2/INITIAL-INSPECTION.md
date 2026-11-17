# VEXOR — Etapa 9.2: Inspeção Inicial

**Escopo inspecionado antes da implementação:**

1. **Migrations e Policies de Storage (`supabase/migrations/20261110000003_rls_and_grants.sql`, linhas 447–478):**
   - Bucket `avatars` já criado com `public = true`, `file_size_limit = 2097152` (2 MB) e `allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']`.
   - `avatars_insert_own`: `bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_active_member())`.
   - `avatars_update_own` e `avatars_delete_own`: mesma restrição de pasta do próprio `auth.uid()` + `public.is_active_member()`.
   - SVG intencionalmente bloqueado pelo bucket.

2. **Cliente Supabase Browser (`src/lib/supabase/client.ts`):**
   - `createClient()` utiliza `createBrowserClient<Database>(supabaseUrl, supabaseKey)` com chave pública (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`), sem `service_role`.

3. **Serviço e UI de Perfil (`src/features/profile/`):**
   - `profile-service.ts`: `updateOwnProfile(...)` valida `FORBIDDEN_UPDATE_FIELDS`, verifica `supabase.auth.getUser()` e atualiza apenas colunas permitidas de `public.profiles` (incluindo `avatar_url`).
   - `profile-edit-modal.tsx`: possuía apenas `<input type="url">` manual para `avatarUrl`, sem seleção de arquivo, prévia ou upload ao Storage.
   - `profile-header.tsx`: exibia `profile.avatarUrl` com `<Image>`, porém mantinha `imgError` sem reset quando `profile.avatarUrl` mudava.
   - `src/features/auth/validation.ts`: `validateProfileUpdate` exige que `avatarUrl` não vazio comece com `"https://"`.
