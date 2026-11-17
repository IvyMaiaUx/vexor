# Etapa 9.1.17.1.1 — Correção de `PROF-AUD-02` (`signOutError` e Sincronização de Sessão)

**Arquivos modificados:**
- `src/features/auth/session-sync.ts`
- `src/features/auth/use-auth-store.ts`

---

## 1. Causa Raiz

Na Etapa 9.1.17, `setAuthenticatedSession(profile)` em `use-auth-store.ts` gravava `DEFAULT_AUTH_SYNC_META` diretamente em `AUTH_SYNC_META_KEY`, sobrescrevendo `signOutError: false` mesmo quando havia uma falha de logout ainda não resolvida.

---

## 2. Solução Implementada

Foi criado o helper `applyAuthenticatedSessionToStorage(storage, profile)` em `src/features/auth/session-sync.ts`, reutilizado por `setAuthenticatedSession()` em `use-auth-store.ts`:

- Lê o estado atual via `readSyncMeta(storage)`.
- Preserva `prevMeta.signOutError` e `prevMeta.isSigningOut` tanto ao atualizar a sessão (`profile !== null`) quanto ao limpar o cache de perfil (`profile === null`).
- `signOutError` só é limpo quando `performConsistentSignOut()` conclui com sucesso (ou em login explícito do modo demo `signInWithProfile`).
- Mantidos intactos: `syncEpoch`, `bumpSyncEpoch()`, deduplicação *single-flight* em `syncClientSessionFromServer()` e `performConsistentSignOut()`, recuperação de senha e isolamento entre Supabase e `DEMO_PROFILES`.
