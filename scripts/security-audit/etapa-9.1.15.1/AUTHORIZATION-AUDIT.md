# ETAPA 9.1.15.1 — AUTHORIZATION AUDIT

## 1. Camadas Avaliadas

- **Páginas administrativas (`/admin/*`):**
  - Protegidas em 3 camadas: `src/proxy.ts` (`evaluateProtectedRouteAccess`), Server Component layouts (`src/app/admin/layout.tsx` exigindo `"moderator"`, `src/app/admin/users/layout.tsx` e `src/app/admin/audit/layout.tsx` exigindo `"admin"`), e `AdminGuard` no cliente.
  - **Achado:** `FINDING-02` (baixa) — `AdminLayout` usa redirect fixo `?next=%2Fadmin` quando acionado sem `proxy.ts`.
- **APIs existentes (`src/app/api/**`):**
  - Apenas `GET /api/auth/session` e `POST /api/auth/logout` existem atualmente. Não há APIs administrativas nem Server Actions (`"use server"`) implementadas ainda (`FINDING-03`).
  - `requireServerAuthorization()` está pronto para uso em futuras APIs/Server Actions.
- **Rotas de pesquisa protegidas (`/cybercrime-research/*`) e rotas autenticadas cliente (`/catalog/submit`, `/forum/new`, `/profile`):**
  - **Achado:** `FINDING-01` (média) — `/cybercrime-research/*` depende apenas de `ResearchAccessGuard` no cliente (`useAuthStore`), sem bloqueio equivalente no `proxy.ts` ou em Server Component layout.

## 2. Matriz Conceitual e Offline Testada

| Perfil / Estado | `/admin` | `/admin/users` & `/admin/audit` | `requireServerAuthorization("active_member")` |
| :--- | :---: | :---: | :---: |
| Anônimo | Bloqueado (`redirect /login`) | Bloqueado (`redirect /login`) | `401` (`unauthenticated`) |
| Membro comum | Bloqueado (`redirect /catalog`) | Bloqueado (`redirect /catalog`) | `200` (`authorized`) |
| Moderador | Permitido | Bloqueado (`redirect /catalog` / `/admin`) | `200` (`authorized`) |
| Administrador | Permitido | Permitido | `200` (`authorized`) |
| Usuário suspenso | Bloqueado (`redirect /catalog`) | Bloqueado (`redirect /catalog`) | `403` (`account_suspended`) |
| Perfil inexistente | Bloqueado (`redirect /catalog`) | Bloqueado (`redirect /catalog`) | `403` (`profile_missing`) |
