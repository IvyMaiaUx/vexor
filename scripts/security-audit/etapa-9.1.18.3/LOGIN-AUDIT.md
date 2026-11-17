# LOGIN AUDIT — ETAPA 9.1.18.3

Arquivo auditado: `scripts/test-login-etapa9-1-14.mjs`  
Implementação comparada: `src/features/auth/login-service.ts`, `src/app/login/page.tsx`, `src/app/api/auth/session/route.ts`, `src/lib/supabase/auth.ts`, `src/features/auth/use-auth-store.ts`  
Data: 2026-11-14

> **Nota de caminho arquitetural:** o módulo de resolução e autorização de sessão no repositório reside em `src/lib/supabase/auth.ts` (não existe `src/lib/security/auth.ts`).

---

## 1. Checklist de Verificação do Login e Sessão

| Requisito | Status na Implementação Atual | Cobertura em `test-login-etapa9-1-14.mjs` | Observação |
| --- | --- | --- | --- |
| Uso de `supabase.auth.signInWithPassword()` | Sim (`loginWithSupabase`) | **Coberto** (Tests 1, 2, 3, 4, 5, 6, 7) | Verifica e-mail e senha passados ao cliente. |
| Sem fallback silencioso para `DEMO_PROFILES` | Sim (`handleSubmit` chama apenas `loginWithSupabase`; `handleDemoSignIn` é acionado só pelos botões demo) | **Parcial** (Test 8 verifica ausência de `signInWithIdentifier(` em `login/page.tsx`) | Não executa `LoginPage` em runtime, mas `loginWithSupabase` não importa `DEMO_PROFILES`. |
| Identidade validada no servidor (`getUser()`) | Sim (`resolveServerSession()` -> `supabase.auth.getUser()`) | **Indireto** (via `session/route.ts` no Test 10 + runtime real em `test-session-auth-etapa9-1-15.mjs`) | `test-login-etapa9-1-14.mjs` usa `fetchSessionContext` mockado. |
| Consulta do perfil após autenticação e correspondência `profile.id === user.id` | Sim (`resolveServerSessionWithClient` valida `profile.id !== user.id`) | **Indireto** (`test-session-auth-etapa9-1-15.mjs` Test 6 cobre divergência `profile.id !== user.id`; `test-login-etapa9-1-14.mjs` confia em `fetchSessionContext`) | `loginWithSupabase` delega o check de ownership ao servidor. |
| Perfil ausente tratado sem criação manual | Sim (`errorCode: "profile_missing"`) | **Coberto** (Test 4 + `assert.doesNotMatch(loginServiceCode, /insert\(/i)`) | Rejeita login sem perfil sem tentar `INSERT`. |
| Usuário suspenso bloqueado de áreas protegidas | Sim (`status: "suspended"`, sem `safeRedirectPath`; `src/proxy.ts` bloqueia `/admin/*` e `/cybercrime-research/*`) | **Coberto** (Test 5) | Confirma ausência de `safeRedirectPath` no retorno `suspended`. |
| `role` e `is_suspended` não confiados do cliente | Sim (`resolveServerSession()` lê do banco) | **Coberto** em `test-session-auth-etapa9-1-15.mjs` (Test 11) | Em `test-login-etapa9-1-14.mjs`, verificado via Test 10 (estático). |
| Redirecionamento seguro contra open redirect | Sim (`getSafeRedirectPath(input.nextPath, "/catalog")`) | **Coberto** (Tests 6 e 7) | Rejeita `https://evil.com/phish`. |
| Erros neutros sem enumeração indevida | Sim (`invalid_credentials` para erros não-429) | **Coberto** (Test 2) | Não distingue e-mail inexistente de senha incorreta. |
| `Cache-Control: no-store` em `/api/auth/session` | Sim (todos os 4 retornos em `src/app/api/auth/session/route.ts`) | **Estático** (Test 10) | Ver achado **MÉDIO** abaixo. |

---

## 2. Auditoria Específica do Test 10 (Atualizado na Etapa 9.1.18.2)

Trecho em `scripts/test-login-etapa9-1-14.mjs` (linhas 208–215):
```js
const sessionRouteCode = fs.readFileSync(path.join(rootDir, "src/app/api/auth/session/route.ts"), "utf8");
assert.match(sessionRouteCode, /resolveServerSession/);
assert.match(sessionRouteCode, /evaluateSessionAuthorization/);
assert.match(sessionRouteCode, /resolution\.profile/);
assert.match(sessionRouteCode, /Cache-Control.*no-store/);
assert.doesNotMatch(loginServiceCode, /insert\(/i);
```

**Parecer técnico:**
- **Coerência com a implementação atual:** Sim — `src/app/api/auth/session/route.ts` efetivamente chama `resolveServerSession()`, `evaluateSessionAuthorization(resolution, "authenticated")`, retorna `resolution.profile` e define `{ "Cache-Control": "no-store" }` nas respostas `503` e `200`.
- **Não houve enfraquecimento em relação ao Test 10 original:** O Test 10 original já era uma única regex estática (`/getAuthenticatedSessionContext/`). A atualização manteve o mesmo nível e ampliou para 4 verificações específicas + `insert\(/i`.
- **Limitação (Achado MÉDIO):** Continua sendo uma verificação estática por regex em texto-fonte, sem executar `GET()` de `/api/auth/session` em runtime com mocks de `resolveServerSession` para validar headers HTTP e status `200`/`503` diretamente.
