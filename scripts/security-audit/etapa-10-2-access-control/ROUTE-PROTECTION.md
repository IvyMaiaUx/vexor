# VEXOR — Etapa 10.2: Proteção de Rotas (`src/proxy.ts` e `src/lib/supabase/auth.ts`)

## 1. Matriz de Rotas

| Rota / Prefixo | Visitante Não Autenticado | Membro Ativo | Moderador / Admin |
| :--- | :--- | :--- | :--- |
| `/` | Permitido (`allow`) | Permitido | Permitido |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/*` | Permitido (`allow`) | Permitido | Permitido |
| `/catalog`, `/catalog/*` (`/bookmarks`, `/submit`, `/[slug]`) | Bloqueado → `/login?next=...` | Permitido | Permitido |
| `/forum`, `/forum/*` (`/new`, `/[id]`) | Bloqueado → `/login?next=...` | Permitido | Permitido |
| `/my-contributions` | Bloqueado → `/login?next=...` | Permitido | Permitido |
| `/profile`, `/profile/[username]` | Bloqueado → `/login?next=...` | Permitido | Permitido |
| `/cybercrime-research`, `/cybercrime-research/*` | Bloqueado → `/login?next=...` | Permitido | Permitido |
| `/admin`, `/admin/*` (exceto `/users` e `/audit`) | Bloqueado → `/login?next=...` | Bloqueado → `/catalog` | Permitido |
| `/admin/users`, `/admin/audit` | Bloqueado → `/login?next=...` | Bloqueado → `/catalog` | Apenas `admin` (`moderator` → `/catalog`) |

## 2. Mecanismo Server-Side
- `isProtectedAppRoute(pathname)` em `src/lib/supabase/auth.ts` centraliza a lista de prefixos protegidos.
- `src/proxy.ts` chama `resolveServerSessionWithClient(supabase)` (`supabase.auth.getUser()` + consulta à tabela `profiles`) e aplica `evaluateProtectedRouteAccess(pathname, resolution)` antes da renderização da página.
- Todos os redirecionamentos para `/login?next=...` passam por `getSafeRedirectPath()`, prevenindo Open Redirect.
- Usuários suspensos ou sem perfil válido em `/catalog`, `/forum`, `/my-contributions` ou `/profile` são redirecionados para `/` (evitando loop de redirecionamento em `/catalog`).
