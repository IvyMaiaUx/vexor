# VEXOR — Etapa 10.2: Segurança das APIs Privadas

## 1. Endpoints Auditados
- `/api/admin/dashboard`, `/api/admin/users`, `/api/admin/moderation`, `/api/admin/reports`, `/api/admin/resources`, `/api/admin/audit`:
  - Todos delegam aos handlers de `src/features/admin/server/admin-server-handlers.ts`, que validam sessão e role no servidor via `requireServerAuthorization("moderator" | "admin")`.
  - Chamadas diretas sem sessão retornam `HTTP 401` sem dados internos.
- `/api/research`, `/api/research/categories`, `/api/research/[id]`, `/api/research/[id]/recipients`, `/api/research/[id]/recipients/[userId]`, `/api/research/[id]/resubmit`:
  - Todos delegam aos handlers de `src/features/cybercrime-research/server/research-server-handlers.ts`, que validam sessão ativa via `requireServerAuthorization("active_member")`.
  - Chamadas diretas sem sessão retornam `HTTP 401`.
- `/api/auth/session` e `/api/auth/logout`:
  - Estritamente necessários ao fluxo de sessão. Para visitantes sem sessão, `/api/auth/session` retorna `{ authenticated: false, user: null, profile: null }` sem expor dados privados.

## 2. Garantias Mantidas
- Nenhuma autorização baseada em `localStorage`.
- Nenhum uso de `service_role`.
- Nenhuma alteração de schema ou políticas RLS remotas nesta etapa.
- Testes desta etapa contra handlers de API foram executados offline com mocks de cliente Supabase (sem afirmar execução de testes remotos de RLS).
