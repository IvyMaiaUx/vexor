# Etapa 9.1.17.1 — Auditoria de Exposição de Dados Públicos

**Arquivos inspecionados (READ-ONLY):**
- `src/app/profile/page.tsx`
- `src/app/profile/[username]/page.tsx`
- `src/features/profile/profile-header.tsx`
- `src/features/profile/profile-edit-modal.tsx`

---

## Verificações

1. **Perfis públicos consultam exclusivamente `public.public_profiles`?**  
   **Sim.** `readPublicProfileByUsername()` em `profile-service.ts` consulta `.from("public_profiles")`.
2. **`role`, `is_suspended` ou dados privados em respostas públicas?**  
   **Não.** A view `public_profiles` omite `role` e `is_suspended` (e e-mail não existe em `profiles`). Em `mapPublicProfileRowToAuthUserProfile()`, `role` é fixado como `"member"` apenas para compatibilidade visual de `ProfileHeader` (`PROF-AUD-03`).
3. **Usernames inexistentes tratados corretamente?**  
   **Sim.** Retorna `not_found` e exibe a tela `notFoundTitle` sem vazar erro interno.
4. **Dados de perfil anterior durante troca de usuário (`PROF-AUD-01`, `BAIXA`):**  
   Em `ProfileEditModal` (`src/features/profile/profile-edit-modal.tsx`), o componente permanece montado quando `isOpen === false` (retorna `null` após `useState(profile.*)`). Caso ocorra troca de usuário na mesma sessão SPA sem desmontar a página, o estado inicial do modal pode reter valores do mount anterior até ser sincronizado.
5. **Separação do modo `demo` vs modo `supabase`:**  
   **Preservada.** `/profile` exibe banner explícito quando `authMode === "demo"` e não recorre a `DEMO_PROFILES` em falhas de conexão ou `profile_missing`. `/profile/[username]` só consulta `getProfileByUsername` quando `authMode === "demo"`.
6. **Estados de carregamento e erro expõem informações sensíveis?**  
   **Não.** As mensagens de erro são genéricas e traduzidas (PT-BR/EN), sem stack traces, tokens ou detalhes internos do banco.
