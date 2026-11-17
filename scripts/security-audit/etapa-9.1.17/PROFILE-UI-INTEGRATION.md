# Etapa 9.1.17 — Integração da Interface de Perfil

**Arquivos atualizados:**
- `src/features/profile/profile-edit-modal.tsx`
- `src/features/profile/profile-header.tsx`
- `src/app/profile/page.tsx`
- `src/app/profile/[username]/page.tsx`
- `src/features/auth/validation.ts`

---

## 1. Funcionalidades Integradas

- **`ProfileEditModal`:**
  - Adicionado campo `username` (editável conforme `GRANT UPDATE` da migration).
  - Em `authMode === "supabase"`, chama `updateOwnProfile()`, previne submissões duplicadas (`isSubmitting`), exibe mensagens de erro claras (incluindo conflito de username, bloqueio RLS e erro de rede) mantendo os dados digitados, e sincroniza o store após sucesso (`setAuthenticatedSession` + `refreshSession`).
  - Protege alterações não salvas contra fechamento acidental (`isDirty` + confirmação).
  - Em `authMode === "demo"`, mantém o comportamento local do simulador.
- **`MyProfilePage` (`/profile`):**
  - Exibe estados explícitos para `loading`, `profile_missing` (sem autocriação), `connection_error` (com botão de nova tentativa), `suspended` (aviso + ocultação do botão de edição em `ProfileHeader`), `unauthenticated` e `demo` banner.
- **`PublicProfilePage` (`/profile/[username]`):**
  - Quando não é o usuário atual nem um perfil do modo `demo`, consulta `readPublicProfileByUsername()` na view `public.public_profiles`, exibindo estados `loading`, `connection_error` e `not_found`.
