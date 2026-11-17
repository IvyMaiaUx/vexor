# ETAPA 9.1.15.1 — SESSION SYNC AUDIT

## 1. Mecanismos Inspecionados

- `inFlightSync`, `syncEpoch`, `bumpSyncEpoch()` e `syncClientSessionFromServer()` em `src/features/auth/session-sync.ts`.
- `refreshSession()` em `src/features/auth/use-auth-store.ts`.
- `AuthSessionSync` em `src/components/auth/auth-session-sync.tsx` (`onAuthStateChange`, `focus`, `visibilitychange`, cooldown `1000ms`, cleanup).

## 2. Verificações

1. **Deduplicação de chamadas simultâneas:** Confirmada via `if (inFlightSync) return await inFlightSync;` (validado em `Test 13b`).
2. **Prevenção de sobrescrita por resposta atrasada:** Confirmada via `const startEpoch = syncEpoch` comparado após `await fetchSession()` (`Test 13b`).
3. **Invalidação de sync pendente no logout:** `performConsistentSignOut()` chama `bumpSyncEpoch()` antes de limpar storage.
4. **Ciclos de requisição:** `AuthSessionSync` aplica cooldown de `1000ms` para `focus`/`visibilitychange` e filtra `onAuthStateChange` para eventos específicos (`SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`). `syncClientSessionFromServer()` não chama métodos que disparam `onAuthStateChange`.
5. **Cleanup de listeners:** `AuthSessionSync` remove `focus`, `visibilitychange`, `subscription.unsubscribe()` e marca `active = false`.
6. **Falhas de conexão:** Preservam `prevMeta.authMode` e `SESSION_STORAGE_KEY` com `syncError: "connection_error"` sem conceder acesso no servidor (`503`).
7. **Sessão expirada:** Limpa `SESSION_STORAGE_KEY` e marca `sessionExpired: true` quando `prevMeta.authMode === "supabase"`.
8. **F5 e novas abas:** `AuthSessionSync` dispara `triggerSync(true)` ao montar e escuta eventos `storage` / `AUTH_STORE_EVENT` em `useAuthStore`.
