# VEXOR — Etapa 9.6 — Inspeção Inicial do Módulo Administrativo e Backend

**Data:** 2026-11-15  
**Escopo:** Inspeção estática do painel administrativo (`/admin`), camada `IAdminDataProvider`, autorização SSR (`src/lib/supabase/auth.ts`), schema oficial e RPCs em `supabase/migrations/`.

---

## 1. Estrutura Atual do Painel Administrativo (`src/app/admin/` e `src/features/admin/`)

### 1.1 Rotas SSR Protegidas
- `src/app/admin/layout.tsx`: exige `requireServerAuthorization("moderator")`.
- `src/app/admin/users/layout.tsx`: exige `requireServerAuthorization("admin")`.
- `src/app/admin/audit/layout.tsx`: exige `requireServerAuthorization("admin")`.
- `src/app/admin/moderation/page.tsx`: protegida pelo layout pai (`moderator`).
- `src/app/admin/reports/page.tsx`: protegida pelo layout pai (`moderator`).

### 1.2 Camada de Serviços e Provedor Atual
- `src/features/admin/services/admin-provider.ts`: atualmente instancia `createSimulatedAdminProvider()` e exporta `adminDataProvider`.
- `src/features/admin/types.ts`: define `IAdminDataProvider` com seis sub-serviços:
  1. `dashboard` (`IAdminDashboardService`)
  2. `users` (`IAdminUsersService`)
  3. `moderation` (`IAdminModerationService`)
  4. `reports` (`IAdminReportsService`)
  5. `resources` (`IAdminResourcesService`)
  6. `audit` (`IAdminAuditService`)
- `src/features/admin/data/simulated-admin-data.ts`: armazena dados demonstrativos em memória (será mantido isolado para testes legados e nunca misturado ou usado como fallback silencioso em produção).

---

## 2. Schema, Policies RLS e RPCs Oficiais (Backend Supabase)

### 2.1 Tabelas Relevantes e Policies RLS
1. **`public.profiles`** (`id`, `username`, `display_name`, `avatar_url`, `bio`, `interests`, `github_url`, `linkedin_url`, `preferred_language`, `role`, `is_suspended`, `created_at`):
   - Policy `profiles_select_own_or_mod`: moderadores e admins (`is_moderator()`) podem consultar todos os perfis.
   - Alteração de `role` e `is_suspended` por clientes diretos não é usada; deve ocorrer exclusivamente via RPCs `admin_set_user_role` e `admin_set_user_suspension`.
2. **`public.resources`**:
   - Policy `resources_select`: moderadores e admins (`is_moderator()`) podem listar recursos em qualquer `status` (`pending`, `approved`, `rejected`, `archived`).
3. **`public.topics`** e **`public.posts`**:
   - Policies `topics_select` e `posts_select`: moderadores e admins (`is_moderator()`) podem listar tópicos e posts em qualquer `status` (`published`, `hidden`, `deleted`).
4. **`public.reports`**:
   - Policy `reports_select`: moderadores e admins (`is_moderator()`) podem listar todas as denúncias (`open`, `reviewing`, `resolved`, `dismissed`).
5. **`public.audit_logs`**:
   - Policy `audit_logs_select_admin`: **apenas `is_admin()`** pode consultar `audit_logs`. Moderadores não-admin recebem negação (`42501` / 0 linhas dependendo da operação).
   - Não há `INSERT`/`UPDATE`/`DELETE` liberados para usuários autenticados em `audit_logs`. As RPCs gravam auditoria via `write_audit_log(...)` no banco.
6. **Cybercrime Research**:
   - Não existe tabela para submissões de Cybercrime Research no schema atual (`src/types/database.types.ts`).

### 2.2 RPCs Administrativas Oficiais (`supabase/migrations/20261113143000_security_hardening.sql`)
1. `admin_set_user_role(p_user_id uuid, p_role user_role) -> void`
   - Exige `is_admin()`, bloqueia auto-rebaixamento e rebaixamento do último admin ativo, usa `pg_advisory_xact_lock`, registra `user.role_changed` em `audit_logs`.
2. `admin_set_user_suspension(p_user_id uuid, p_suspended boolean, p_reason text DEFAULT NULL) -> void`
   - Exige `is_admin()`, bloqueia auto-suspensão e suspensão do último admin ativo, exige justificativa quando `p_suspended = true`, registra `user.suspended` / `user.unsuspended` em `audit_logs`.
3. `moderate_resource(p_resource_id uuid, p_decision resource_status, p_reason text DEFAULT NULL) -> void`
   - Exige `is_moderator()`, aceita `'approved' | 'rejected' | 'archived'`, exige justificativa em `'rejected'`, registra `resource.<decision>` em `audit_logs` e cria notificação.
4. `moderate_topic(p_topic_id uuid, p_action text, p_reason text DEFAULT NULL) -> void`
   - Exige `is_moderator()`, aceita `'hide' | 'unhide' | 'delete' | 'pin' | 'unpin' | 'lock' | 'unlock'`, exige justificativa em `'hide'` e `'delete'`, registra `topic.<action>` em `audit_logs`.
5. `moderate_post(p_post_id uuid, p_action text, p_reason text DEFAULT NULL) -> void`
   - Exige `is_moderator()`, aceita `'hide' | 'unhide' | 'delete'`, exige justificativa em `'hide'` e `'delete'`, registra `post.<action>` em `audit_logs`.
6. `resolve_report(p_report_id uuid, p_status report_status, p_note text DEFAULT NULL) -> void`
   - Exige `is_moderator()`, exige `p_status <> 'open'` (`'reviewing' | 'resolved' | 'dismissed'`), registra `handled_by`, `handled_at`, `resolution_note` e `report.<status>` em `audit_logs`.

---

## 3. Conclusões para a Arquitetura da Etapa 9.6

1. Criar **Route Handlers protegidos no servidor** (`src/app/api/admin/...`) usando `requireServerAuthorization` (`"moderator"` ou `"admin"` conforme a rota/operação) e `createClient()` (`@/lib/supabase/server`), sem `service_role`.
2. Implementar `createSupabaseAdminProvider()` em `src/features/admin/data/supabase-admin-provider.ts` consumindo as rotas `/api/admin/**` e mapear erros de forma estruturada e segura.
3. Preservar `createSimulatedAdminProvider()` para uso exclusivo em testes automatizados isolados que dependem do estado em memória, sem nunca fazer fallback silencioso para dados simulados na aplicação real.
4. Tratar explicitamente funcionalidades sem suporte no schema (ex.: fila de Cybercrime Research, ações `escalate`/`request_revision` não existentes nas RPCs, e ausência de `email`/`lastActivityAt` em `public.profiles`).
