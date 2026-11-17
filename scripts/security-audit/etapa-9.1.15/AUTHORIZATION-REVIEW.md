# ETAPA 9.1.15 — Authorization Review

- **Data:** 2026-11-13

## 1. Regras de Autorização no Servidor

`evaluateSessionAuthorization()` (`src/lib/supabase/auth.ts`) espelha as funções SQL oficiais (`current_user_role()`, `is_active_member()`, `is_moderator()`, `is_admin()`):
- **Não autenticado:** `401` (`unauthenticated`), todas as flags `false`.
- **Sem perfil ou ID divergente:** `403` (`profile_missing`), todas as flags de permissão `false`.
- **Suspenso (`is_suspended = true`):** `403` (`account_suspended`), `isActiveMember = false`, `isModerator = false`, `isAdmin = false` (mesmo que `role` seja `admin`).
- **Membro ativo (`member`):** `isActiveMember = true`, `isModerator = false`, `isAdmin = false`.
- **Moderador (`moderator`):** `isActiveMember = true`, `isModerator = true`, `isAdmin = false`.
- **Administrador (`admin`):** `isActiveMember = true`, `isModerator = true`, `isAdmin = true`.

## 2. Proteção de Rotas e APIs

- `src/proxy.ts` utiliza `evaluateProtectedRouteAccess()` para proteger `/admin/*` no servidor antes de renderizar a página:
  - Não autenticados -> redirect para `/login?next=...` (sanitizado via `getSafeRedirectPath()`).
  - Membro comum, suspenso, sem perfil ou erro de conexão -> redirect para `/catalog`.
  - `/admin/users` e `/admin/audit` exigem estritamente `admin`; demais rotas `/admin/*` exigem `moderator` ou `admin`.
- `requireServerAuthorization()` fornece verificação pronta para Route Handlers / APIs no servidor.
- `AdminGuard` e `ResearchAccessGuard` respeitam `isLoading` durante hidratação inicial e permanecem apenas como camada de UX complementar às políticas RLS e ao proxy/servidor.
