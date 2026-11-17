# PROTECTED ROUTES REVIEW — VEXOR

Data: 2026-11-14  
Escopo: Verificação das proteções de rotas privadas, autorização por papel/suspensão e segurança de sessão.

---

## 1. Camada de Proxy (`src/proxy.ts`)

- `updateSession(request)` restringe explicitamente `isProtectedArea` a:
  - `pathname === "/admin"` ou `pathname.startsWith("/admin/")`
  - `pathname === "/cybercrime-research"` ou `pathname.startsWith("/cybercrime-research/")`
- Dentro de `isProtectedArea`, o proxy chama `resolveServerSessionWithClient()` (que valida o usuário no servidor via `supabase.auth.getUser()` e consulta `public.profiles`) e `evaluateProtectedRouteAccess(pathname, resolution)`.
- Visitantes não autenticados recebem `NextResponse.redirect` (`HTTP 307`) para `/login?next=...` com caminho sanitizado por `getSafeRedirectPath()`.
- Usuários autenticados sem perfil, suspensos (`is_suspended`) ou sem o papel exigido (`moderator` para `/admin/*`; `admin` para `/admin/users/*` e `/admin/audit/*`) são redirecionados para `/catalog`.

---

## 2. Camada de Layouts de Servidor

- `src/app/admin/layout.tsx`: força `export const dynamic = "force-dynamic"` e executa `requireServerAuthorization("moderator")`. Redireciona não autenticados para `/login?next=%2Fadmin` e demais não autorizados para `/catalog`.
- `src/app/cybercrime-research/layout.tsx`: força `export const dynamic = "force-dynamic"` e executa `requireServerAuthorization("active_member")`. Redireciona não autenticados para `/login?next=%2Fcybercrime-research` e suspensos/sem perfil para `/catalog`.

---

## 3. Garantias Preservadas

- Nenhuma validação de sessão global foi desativada.
- Nenhuma migration, tabela, RLS, policy, trigger, RPC ou grant do Supabase foi modificado.
- `/profile` não expõe dados privados sem sessão autenticada e `/profile/[username]` consulta apenas `public.public_profiles`.
- Usuários suspensos continuam sem acesso às áreas protegidas e sujeitos às políticas RLS do PostgreSQL/Supabase.
