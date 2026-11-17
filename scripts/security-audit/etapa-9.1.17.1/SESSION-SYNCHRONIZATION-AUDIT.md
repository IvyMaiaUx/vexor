# Etapa 9.1.17.1 — Auditoria de Sincronização de Sessão

**Arquivos inspecionados (READ-ONLY):**
- `src/features/auth/session-sync.ts`
- `src/features/auth/use-auth-store.ts`
- `src/components/auth/auth-session-sync.tsx`
- `src/features/profile/profile-edit-modal.tsx`

---

## Análise de Concorrência e Consistência

1. **`syncEpoch`, single-flight e `performConsistentSignOut()`:**  
   Preservados integralmente em `session-sync.ts` e `use-auth-store.ts`. Um logout incrementa `syncEpoch`, descartando respostas atrasadas de `/api/auth/session`.
2. **`AuthSessionSync`:**  
   Escuta `focus`, `visibilitychange` (com cooldown de 1s) e `onAuthStateChange` (`SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`), acionando `refreshSession()`.
3. **`setAuthenticatedSession()` após edição de perfil (`PROF-AUD-02`, `BAIXA`):**  
   Após `updateOwnProfile()` retornar `update_success`, `ProfileEditModal` chama `setAuthenticatedSession(result.profile)` seguido de `void refreshSession()`.
   - Ponto positivo: atualização imediata na UI e revalidação assíncrona no servidor (`/api/auth/session`).
   - Ressalva (`PROF-AUD-02`): `setAuthenticatedSession()` grava `DEFAULT_AUTH_SYNC_META` (com `signOutError: false`), podendo limpar um aviso prévio de erro de logout caso o usuário edite o perfil enquanto `signOutError` estava ativo; também depende da revalidação subsequente de `refreshSession()` caso ocorra mudança concorrente de `role`/`is_suspended` no banco.
4. **Hardening de `updateProfile()` no `useAuthStore`:**  
   Remove `id`, `role` e `isSuspended` em tempo de execução e não grava em `cybersec_registered_users` quando `authMode === "supabase"`.
