# Etapa 9.1.17.1 — Auditoria do Serviço de Perfil (`profile-service.ts`)

**Arquivos inspecionados (READ-ONLY):**
- `src/features/profile/profile-service.ts`
- `src/features/auth/use-auth-store.ts`
- `src/features/auth/validation.ts`

---

## Checklist de Verificação

1. **`readOwnProfile()` valida identidade com `supabase.auth.getUser()`?**  
   **Sim.** Chama `supabase.auth.getUser()` antes de qualquer consulta à tabela `public.profiles`.
2. **Perfil consultado pertence ao usuário autenticado?**  
   **Sim.** Filtra `.eq("id", userData.user.id)` e valida `row.id !== userData.user.id`.
3. **Proteção contra inconsistência entre `user.id` e `profile.id`?**  
   **Sim.** Tanto `readOwnProfile()` quanto `updateOwnProfile()` comparam `data.id !== userData.user.id` (e `expectedUserId !== userData.user.id`).
4. **`updateOwnProfile()` impede alterações de campos administrativos?**  
   **Sim.** Bloqueia explicitamente (`forbidden_field`) se o objeto de entrada contiver `id`, `role`, `is_suspended`, `isSuspended`, `created_at`, `createdAt`, `updated_at` ou `updatedAt` antes mesmo de validar ou consultar o banco.
5. **Payload de atualização contém exclusivamente campos permitidos?**  
   **Sim.** Constrói `ProfileUpdateRow` com allowlist explícita das 8 colunas permitidas (`username`, `display_name`, `avatar_url`, `bio`, `interests`, `github_url`, `linkedin_url`, `preferred_locale`).
6. **Tratamento de perfil inexistente, falha de rede, suspensão e erro de RLS?**  
   **Sim.** `readOwnProfile()` retorna `"profile_missing"`, `"connection_error"`, `"suspended"` e `"unauthenticated"`. `updateOwnProfile()` retorna `"rls_denied"`, `"username_taken"`, `"validation_error"`, `"connection_error"` e `"unauthenticated"`.
7. **Possibilidade de atualização de perfil de outro usuário por manipulação de parâmetros?**  
   **Não.** O filtro `.eq("id", userData.user.id)` usa sempre o `id` retornado por `getUser()` (nunca um ID fornecido pelo cliente), e a RLS `profiles_update_own` no PostgreSQL reforça `id = auth.uid()`.
8. **Validação de `username` e conflitos?**  
   **Sim.** Normaliza para minúsculas, valida contra `USERNAME_REGEX` (`^[a-z0-9_]{3,30}$`, idêntico à constraint `profiles_username_format`), e mapeia erro PostgreSQL `23505` para `"username_taken"`.
