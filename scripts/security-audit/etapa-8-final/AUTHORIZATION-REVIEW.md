# Auditoria de Autorização — Etapa 8

## 1. Matriz de Papéis e Camadas de Proteção

| Área / Rota | Nível Exigido | Proxy (`src/proxy.ts`) | Layout Server (`requireServerAuthorization`) | Client Guard |
| :--- | :--- | :--- | :--- | :--- |
| `/admin`, `/admin/moderation`, `/admin/reports`, `/admin/catalog`, `/admin/forum`, `/admin/research` | `moderator` (`moderator` \| `admin` ativos) | `evaluateProtectedRouteAccess` (`moderator`) | `src/app/admin/layout.tsx` (`moderator`, `force-dynamic`) | `<AdminGuard>` em todas as páginas (incluindo `/admin/reports` após correção) |
| `/admin/users` | `admin` (ativo) | `evaluateProtectedRouteAccess` (`admin`) | `src/app/admin/users/layout.tsx` (`admin`, `force-dynamic`) | `<AdminGuard requireAdmin={true}>` |
| `/admin/audit` | `admin` (ativo) | `evaluateProtectedRouteAccess` (`admin`) | `src/app/admin/audit/layout.tsx` (`admin`, `force-dynamic`) | `<AdminGuard requireAdmin={true}>` |
| `/cybercrime-research/*` (6 rotas) | `active_member` (`member` \| `moderator` \| `admin` não suspenso) | `evaluateProtectedRouteAccess` (`active_member`) | `src/app/cybercrime-research/layout.tsx` (`active_member`, `force-dynamic`) | `ResearchAccessGuard` |

## 2. Consistência Verificada

- **Proxy vs. Layouts:** Regras idênticas em `src/proxy.ts` (`evaluateProtectedRouteAccess`) e nos layouts server-side (`src/app/admin/layout.tsx`, `users/layout.tsx`, `audit/layout.tsx`, `cybercrime-research/layout.tsx`).
- **Ausência de bypass por parâmetros ou `localStorage`:** O proxy e os layouts ignoram query strings ou estado local ao decidir autorização; `/admin/moderation` usa `?type=` apenas para filtro inicial da fila.
- **Falha fechada (`fail-closed`):** Em `connection_error`, `profile_missing` ou `account_suspended`, o acesso é negado.
