# LOGIN TEST UPDATE — ETAPA 9.1.18.2

Arquivo atualizado: `scripts/test-login-etapa9-1-14.mjs`  
Data: 2026-11-14

---

## 1. Diagnóstico

Os testes 1 a 9 do script `scripts/test-login-etapa9-1-14.mjs` continuavam válidos e passando (`signInWithPassword`, validação de sessão no servidor, consulta de perfil, rejeição de perfil ausente, bloqueio de usuário suspenso, sanitização de redirecionamento, prevenção de envio duplicado e ausência de credenciais/role confiadas no cliente).

A falha ocorria exclusivamente no **Test 10**:
- Asserção antiga: `assert.match(sessionRouteCode, /getAuthenticatedSessionContext/);` em `src/app/api/auth/session/route.ts`.
- Motivo da obsolescência: na Etapa 9.1.15, `src/app/api/auth/session/route.ts` passou a utilizar `resolveServerSession()` e `evaluateSessionAuthorization(resolution, "authenticated")`, retornando `resolution.profile` e `check.authorization` com header `Cache-Control: no-store`.

---

## 2. Atualização Aplicada (Test 10)

O Test 10 foi atualizado para validar o contrato atual de confiança exclusiva no servidor em `src/app/api/auth/session/route.ts`:

- Presença de `resolveServerSession` e `evaluateSessionAuthorization`.
- Retorno de `resolution.profile` vindo do servidor.
- Presença de `Cache-Control` com `no-store`.
- Manutenção da verificação `assert.doesNotMatch(loginServiceCode, /insert\(/i)`.

---

## 3. Resultado

`node scripts/test-login-etapa9-1-14.mjs` passou integralmente (Tests 1–10, **exit code 0**).
