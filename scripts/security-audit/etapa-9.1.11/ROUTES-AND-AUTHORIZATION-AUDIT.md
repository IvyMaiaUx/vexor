# Etapa 9.1.11 — Routes and Authorization Audit

- **Data:** 2026-11-13
- **Escopo:** Todas as rotas em `src/app/` e guards em `src/features/`.

## 1. Classificação das rotas existentes

| Rota | Classificação | Controle atual | Gap para produção |
|---|---|---|---|
| `/`, `/catalog`, `/catalog/[slug]`, `/forum`, `/forum/[id]`, `/profile/[username]` | Pública | Leitura aberta (dados mockados locais) | Integrar leitura pública via Supabase respeitando RLS (`approved`/`published`/`public_profiles`). |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Pública (Auth) | Client-side mock (`localStorage` / `setTimeout`) | Conectar ao Supabase Auth; redirecionar usuários já logados de `/login` e `/register` se aplicável. |
| `/profile`, `/my-contributions`, `/catalog/submit`, `/forum/new` | Privada (Autenticado / Ativo) | Apenas Client Component (`useAuthStore().user`) | Proteger no `src/proxy.ts` + validação server-side (`getUser()` + `is_suspended`). |
| `/catalog/bookmarks` | Privada (Autenticado) | Sem gate de autenticação (`useCatalogStore().bookmarkedSlugs` em `localStorage`) | Exigir sessão autenticada e persistir em `public.bookmarks`. |
| `/cybercrime-research/*` (`/cases`, `/discussions`, `/labs`, `/library`, `/categories/[slug]`) | Privada (Membro ativo) | Apenas Client Component (`ResearchAccessGuard` via `useAuthStore`) | Exigir sessão válida + `is_suspended = false` no servidor/proxy além da UI. |
| `/admin`, `/admin/moderation`, `/admin/catalog`, `/admin/forum`, `/admin/reports`, `/admin/research` | Restrita (Moderador ou Admin) | Apenas Client Component (`AdminGuard` via `useAuthStore`) | Validar `getUser()` + `role IN ('moderator','admin')` e `!is_suspended` no servidor (`admin/layout.tsx` Server Component ou Route Guard) + RLS/RPCs. |
| `/admin/users`, `/admin/audit` | Restrita (Admin estrito) | Apenas Client Component (`AdminGuard requireAdmin` / `isAdmin`) | Validar `role === 'admin'` e `!is_suspended` no servidor além da UI + RLS (`audit_logs_select_admin` e RPCs `admin_set_user_*`). |

## 2. Falhas de autorização identificadas

1. **Autorização 100% client-side:** Todas as rotas privadas e administrativas são `"use client"` e confiam em `localStorage`. Qualquer usuário pode editar o `localStorage` no navegador e alterar `role: "admin"` ou `isSuspended: false` na UI atual.
2. **Ausência de proteção no `src/proxy.ts`:** O proxy não bloqueia nem redireciona requisições não autenticadas para rotas privadas/admin.
3. **Ausência de tratamento server-side para contas suspensas:** Hoje `isSuspended` é checado apenas em `AdminGuard`, `ResearchAccessGuard` e `useAuthStore.isActiveMember` no cliente.
