# LOGIN ERROR COVERAGE — ETAPA 9.1.18.4 (ETAPA C)

Data: 2026-11-14  
Achado tratado: `MÉDIO-03`  
Arquivo: `scripts/test-login-etapa9-1-14.mjs` (contrato: `src/features/auth/login-service.ts`)

---

## 1. Cobertura Anterior

- Login com sucesso + redirect interno válido (Tests 1 e 6)
- Credenciais inválidas neutras (Test 2)
- Erro de rede (Test 3)
- Perfil ausente `profile_missing` (Test 4)
- Conta suspensa `suspended` sem `safeRedirectPath` (Test 5)
- Sanitização de redirect externo para `/catalog` (Test 7)
- Prevenção de envio duplicado e ausência de `signInWithIdentifier(` (Test 8)
- Ausência de credenciais em storage e `service_role` (Test 9)

---

## 2. Nova Cobertura Comportamental Adicionada (Test 11)

1. **E-mail inválido (`invalid_email`):** rejeita entrada sem chamar `signInWithPassword()`.
2. **Senha curta (`password_too_short`):** rejeita senha com menos de 8 caracteres sem chamar `signInWithPassword()`.
3. **Rate limit (`rate_limited`):** simula HTTP `429` (`over_request_rate_limit`), confirma retorno `{ status: "error", errorCode: "rate_limited" }` sem chamar `fetchSessionContext()` nem fallback para `DEMO_PROFILES`.
4. **Falha de sessão (`fetchSessionContext()` retornando `authenticated: false`):** confirma retorno `{ status: "error", errorCode: "invalid_credentials" }`, sem `profile` e sem `safeRedirectPath`.
