# SESSION ENDPOINT AUDIT — ETAPA 9.1.18.4.1

Arquivo auditado: `scripts/test-session-endpoint-etapa9-1-18-4.mjs`  
Endpoint real: `src/app/api/auth/session/route.ts` (`GET()`) + `src/lib/supabase/auth.ts` (`resolveServerSession`, `evaluateSessionAuthorization`)  
Data: 2026-11-14

---

## 1. Execução Real vs. Mocks

- **Comprovado por execução do handler real:**
  - `test-session-endpoint-etapa9-1-18-4.mjs` importa diretamente `GET` de `src/app/api/auth/session/route.ts` (não reimplementa a lógica da rota).
  - Resolve `next/server` real (`node_modules/next/server.js`), retornando `NextResponse` real.
  - Executa o código real de `resolveServerSession()`, `resolveServerSessionWithClient()` e `evaluateSessionAuthorization()` em `src/lib/supabase/auth.ts`.
  - Valida status HTTP (`200` / `503`), corpo JSON completo e header `Cache-Control: no-store` em todos os 6 cenários.
- **Dependente de mocks:**
  - `@/lib/supabase/server` (`createClient()`) é interceptado via `registerHooks` para injetar `mockSupabase` (`auth.getUser()` e `from("profiles")...maybeSingle()`). Não testa cookies reais do `@supabase/ssr` nem PostgreSQL/RLS remotos.

---

## 2. Verificação dos 6 Cenários

| Cenário | HTTP Status | `Cache-Control` | Verificações Realizadas |
| --- | --- | --- | --- |
| 1. Sessão autenticada | `200` | `no-store` | `authenticated: true`, `status: "authenticated"`, `user.id`, `profile.id`, `profile.role: "moderator"`, `isAuthenticated/isActiveMember/isModerator: true`, `isAdmin: false`. |
| 2. Usuário não autenticado | `200` | `no-store` | `authenticated: false`, `status: "unauthenticated"`, `user: null`, `profile: null`, `isAuthenticated/isActiveMember: false`. |
| 3. Perfil ausente (`profile_missing`) | `200` | `no-store` | `status: "profile_missing"`, `profile: null`, `hasProfile: false`, `isActiveMember: false`, `role: null`, `insert()` lança erro se chamado. |
| 4. Erro de conexão (`connection_error`) | `503` | `no-store` | `authenticated: false`, `status: "connection_error"`, `user: null`, `profile: null`, `isAuthenticated: false`. |
| 5. Perfil suspenso (`role: "admin"`, `is_suspended: true`) | `200` | `no-store` | `is_suspended: true`, `isSuspended: true`, `isActiveMember: false`, `isModerator: false`, `isAdmin: false`. |
| 6. Identidade inconsistente (`profile.id !== user.id`) | `200` | `no-store` | Fail-closed: `status: "profile_missing"`, `profile: null`, `hasProfile: false`, `isActiveMember: false`, `isAdmin: false`. |

---

## 3. Observação de Cobertura (`BAIXO-01`)

- O Cenário 4 testa `connection_error` via exceção em `auth.getUser()` (`throwAuth: true`), mas não testa `connection_error` originado por erro na consulta `from("profiles")` (`profileError`).
