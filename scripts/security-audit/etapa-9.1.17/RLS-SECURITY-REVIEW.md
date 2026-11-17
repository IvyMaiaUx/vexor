# Etapa 9.1.17 — Revisão de Segurança e RLS

**Regra observada:** Nenhuma migration, RLS, policy, trigger ou grant foi alterado. Nenhuma `service_role` é usada no frontend.

---

## Verificação dos Controles

1. **Consulta do próprio perfil (`public.profiles`):** Policy `profiles_select_own_or_mod` permite `id = auth.uid() OR is_moderator()`. `readOwnProfile()` valida `user.id` via `auth.getUser()` e confere `row.id === user.id`.
2. **Bloqueio de modificação de terceiros:** Policy `profiles_update_own` exige `id = auth.uid() AND is_active_member()`. `updateOwnProfile()` adicionalmente valida `expectedUserId === user.id` antes da query e filtra `.eq("id", user.id)`.
3. **Proteção de `role`, `is_suspended` e auditoria:**
   - Banco: `GRANT UPDATE (username, display_name, avatar_url, bio, interests, github_url, linkedin_url, preferred_locale)` exclui `id`, `role`, `is_suspended`, `created_at`, `updated_at`.
   - Aplicação: `updateOwnProfile()` rejeita `forbidden_field` antes de chamar o banco e constrói payload estritamente com as 8 colunas permitidas; `useAuthStore.updateProfile()` também descarta `id`, `role` e `isSuspended`.
4. **Bloqueio de conta suspensa:** `profiles_update_own` exige `public.is_active_member()`. A UI oculta o botão de edição quando `user.isSuspended === true` e `updateOwnProfile()` retorna `rls_denied` se o banco bloquear.
5. **Dados públicos:** `REVOKE SELECT ON public.profiles FROM anon` impede acesso anônimo à tabela privada; `readPublicProfileByUsername()` consulta exclusivamente `public.public_profiles`, que omite `role` e `is_suspended`.
