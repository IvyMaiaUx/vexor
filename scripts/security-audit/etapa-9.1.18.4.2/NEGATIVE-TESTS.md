# NEGATIVE TESTS — ETAPA 9.1.18.4.2

Data: 2026-11-14  
Objetivo: Comprovar que as armadilhas e validadores falham quando há violação simulada (sem modificar código de produção).

---

| Suíte / Teste | Cenário Negativo Simulado | Resultado Observado |
| --- | --- | --- |
| `test-register-etapa9-1-13.mjs` (Test 12b) | Código simulado com `supabase.from("profiles").insert(...)` | `assertNoManualProfileWriteInSource` lançou erro (detectado). |
| `test-register-etapa9-1-13.mjs` (Test 12b) | Código simulado com `supabase.rpc('create_profile', {})` | `assertNoManualProfileWriteInSource` lançou erro (detectado). |
| `test-register-etapa9-1-13.mjs` (Test 12b) | Chamada direta a `trapClient.from("profiles")` e `trapClient.rpc("create_profile")` | Armadilha runtime lançou erro (detectado). |
| `test-login-etapa9-1-14.mjs` (Test 11b) | Chamada simulada a `negTrap.fetchSessionContext()` | Promise rejeitada com `Should not call fetchSessionContext` e `sessionFetched === true`. |
| `test-login-etapa9-1-14.mjs` (Test 11b) | Retorno simulado `{ status: "suspended", safeRedirectPath: "/admin" }` e `{ status: "authenticated", safeRedirectPath: "/catalog" }` | `assertNoLoginSuccessOrRedirect` lançou erro em ambos (detectado). |
| `test-session-endpoint-etapa9-1-18-4.mjs` (Scenario 7) | Resposta `connection_error` com status `200` em vez de `503` | `assertConnectionErrorContract` lançou erro (detectado). |
| `test-session-endpoint-etapa9-1-18-4.mjs` (Scenario 7) | Resposta `connection_error` vazando `postgres://user:secret_dsn@...` no JSON | `assertConnectionErrorContract` lançou erro (detectado). |
