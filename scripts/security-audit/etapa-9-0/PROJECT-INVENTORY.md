# VEXOR — Etapa 9.0: Inventário do Projeto

**Data do diagnóstico:** 2026-11-15  
**Escopo:** Leitura e diagnóstico técnico estritamente não destrutivo (`read-only`). Nenhum arquivo de código, migration, `.env*` ou estado remoto do Supabase foi alterado.

---

## 1. Stack e Infraestrutura

- **Framework:** Next.js 16.4.6 (App Router) + React 19.3.0 + TypeScript 5.x + Tailwind CSS 4.x
- **Backend / Auth / DB:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`) com PostgreSQL 17.11 (Projeto `Vexor`, ref `zcjudcbckcxwnfnrjfte`)
- **Middleware / Proxy de Sessão:** `src/proxy.ts` + `src/lib/supabase/auth.ts`
- **Tipos Gerados:** `src/types/database.types.ts`

---

## 2. Inventário de Módulos em `src/features/`

| Módulo | Diretório | Natureza Atual | Origem de Dados Principal |
| --- | --- | --- | --- |
| **Auth** | `src/features/auth/` | Real (Supabase Auth + SSR) | `supabase.auth.*`, `profiles`, `/api/auth/session`, `/api/auth/logout`, `/auth/callback` |
| **Profile** | `src/features/profile/` | Real (parcial para avatar upload) | `profiles`, `public_profiles` via `src/features/profile/profile-service.ts` |
| **Catalog** | `src/features/catalog/` | Simulada / Local | `FEATURED_RESOURCES` + `window.localStorage` (`cybersec_locale`, `cybersec_bookmarks`, `cybersec_submitted_resources`) em `use-catalog-store.ts` |
| **Forum** | `src/features/forum/` | Simulada / Local | `INITIAL_TOPICS`, `INITIAL_POSTS` + `window.localStorage` (`cybersec_forum_user_topics`, `cybersec_forum_user_posts`, `cybersec_forum_user_votes`) em `use-forum-store.ts` |
| **Activity** | `src/features/activity/` | Simulada / Local | `INITIAL_ACTIVITIES` + `window.localStorage` (`cybersec_user_activities`) em `use-activity-store.ts` |
| **Cybercrime Research** | `src/features/cybercrime-research/` | Simulada / Local | `RESEARCH_CATEGORIES`, `RESEARCH_PILLARS`, `RESEARCH_ARTICLES`, `CASE_STUDIES`, `ANALYSIS_LAB_GUIDES`, `TECHNICAL_DISCUSSIONS` + `localStorage` (`vexor_admin_research_queue`) em `research-service.ts` |
| **Admin** | `src/features/admin/` | Simulada / Em Memória | `createSimulatedAdminProvider()` em `src/features/admin/services/admin-provider.ts` e `simulated-admin-data.ts` (implementando `IAdminDataProvider`) |

---

## 3. Infraestrutura Supabase Existente no Código

### 3.1 Clientes e Helpers (`src/lib/supabase/`)
- Cliente browser e server via `@supabase/ssr`
- `src/lib/supabase/auth.ts`: resolução de sessão via `supabase.auth.getUser()`, leitura de perfil em `profiles`, `requireServerAuthorization(...)` e `evaluateProtectedRouteAccess(...)`

### 3.2 Rotas e Endpoints de Autenticação
- `src/proxy.ts`: atualização de sessão e proteção de rotas no edge/proxy
- `src/app/auth/callback/route.ts`: troca PKCE de código por sessão e validação de redirecionamento via `getSafeRedirectPath`
- `src/app/auth/reset-password/page.tsx`: redefinição de senha via Supabase Auth
- `src/app/api/auth/session/route.ts`: leitura segura do usuário autenticado e perfil
- `src/app/api/auth/logout/route.ts`: encerramento de sessão

### 3.3 Migrations Oficiais (`supabase/migrations/`)
1. `20261110000001_schema.sql`: 12 tabelas no schema `public`, ENUMs e view `public_profiles`
2. `20261110000002_functions_triggers.sql`: 10 triggers/helpers internos + 8 RPCs `SECURITY DEFINER` com `set search_path = ''`
3. `20261110000003_rls_and_grants.sql`: revogação padrão (`revoke all`), grants granulares por coluna, políticas RLS em todas as 12 tabelas e políticas de `storage.objects` para o bucket `avatars`

---

## 4. Pontos de Entrada do Painel Administrativo (`src/app/admin/`)

- `src/app/admin/layout.tsx`: protegido no servidor com `requireServerAuthorization("moderator")`, redirecionando não autenticados para `/login?next=%2Fadmin` e não autorizados para `/catalog`.
- Páginas administrativas (`/admin`, `/admin/users`, `/admin/moderation`, `/admin/reports`, `/admin/audit`, etc.) consomem `adminDataProvider` (`createSimulatedAdminProvider()`).
- Nenhuma chamada `.rpc(...)` existe atualmente em `src/`.
