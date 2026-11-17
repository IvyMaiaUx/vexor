# VEXOR — Etapa 9.6 — Revisão de Autorização (RBAC & SSR)

**Data:** 2026-11-15  
**Escopo:** Verificação de controle de acesso no servidor (`requireServerAuthorization`), layouts SSR e banco de dados (RLS/RPCs).

---

## 1. Matriz de Autorização por Camada

| Recurso / Operação | Layout / Proxy SSR | Route Handler (`requireServerAuthorization`) | PostgreSQL RLS / RPC |
|---|---|---|---|
| `/admin` & `/api/admin/dashboard` | `moderator` (`admin/layout.tsx`) | `moderator` | `is_moderator()` |
| `/admin/moderation` & `/api/admin/moderation` | `moderator` (`admin/layout.tsx`) | `moderator` | `is_moderator()`, `moderate_resource`, `moderate_topic`, `moderate_post` |
| `/admin/reports` & `/api/admin/reports` | `moderator` (`admin/layout.tsx`) | `moderator` | `is_moderator()`, `resolve_report` |
| `/api/admin/resources` | `moderator` | `moderator` | `is_moderator()`, `moderate_resource` |
| `/admin/users` & `/api/admin/users` | `admin` (`admin/users/layout.tsx`) | `admin` | `is_admin()` (`admin_set_user_role`, `admin_set_user_suspension`) |
| `/admin/audit` & `/api/admin/audit` | `admin` (`admin/audit/layout.tsx`) | `admin` | `audit_logs_select_admin` (`is_admin()`) |

## 2. Garantias Implementadas

1. **Não-confiança no cliente:** Toda requisição em `/api/admin/**` executa `requireServerAuthorization(...)` no servidor via `@/lib/supabase/server`, validando sessão (`getUser()`), existência de perfil, ausência de suspensão (`!is_suspended`) e papel mínimo (`moderator` ou `admin`).
2. **Bloqueio de auto-modificação e último admin:**
   - `handleUpdateAdminUserRole` bloqueia auto-rebaixamento (`403`) antes mesmo da RPC e mapeia erro de último admin ativo (`409`).
   - `handleUpdateAdminUserSuspension` bloqueia auto-suspensão (`403`) e exige justificativa (`>= 5` caracteres) para suspensão.
3. **Sem `service_role`:** Todas as operações usam o cliente SSR autenticado do usuário, garantindo que RLS e `auth.uid()` nas RPCs sejam sempre respeitados pelo PostgreSQL.
