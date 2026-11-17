# Etapa 9.1.17 — Integração com `useAuthStore`

**Arquivo atualizado:** `src/features/auth/use-auth-store.ts`

---

## 1. Separação entre Sessão Real e `DEMO_PROFILES`

- `DEMO_PROFILES` foi preservado para o simulador de demonstração (`authMode === "demo"`), sem remoção abrupta.
- Em modo real (`authMode === "supabase"`):
  - A identidade autenticada vem de `supabase.auth.getUser()` no servidor (`GET /api/auth/session`).
  - O perfil, `role` e `isSuspended` vêm exclusivamente de `public.profiles` no servidor.
  - `syncEpoch`, single-flight (`syncClientSessionFromServer`) e `performConsistentSignOut()` foram preservados integralmente.

## 2. Hardening de `updateProfile()` no `useAuthStore`

- `updateProfile()` agora remove explicitamente `id`, `role` e `isSuspended` em tempo de execução antes de atualizar qualquer cache de UI.
- Quando `authMode === "supabase"`, `updateProfile()` **não** grava em `cybersec_registered_users`; a persistência real ocorre via `updateOwnProfile()` em `profile-service.ts`, seguida de `setAuthenticatedSession()` e `refreshSession()`.
