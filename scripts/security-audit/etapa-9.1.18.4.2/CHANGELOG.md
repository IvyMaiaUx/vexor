# CHANGELOG — ETAPA 9.1.18.4.2

Data: 2026-11-14  
Arquivos modificados (exclusivamente scripts de teste):
- `scripts/test-register-etapa9-1-13.mjs`
- `scripts/test-login-etapa9-1-14.mjs`
- `scripts/test-session-endpoint-etapa9-1-18-4.mjs`

Nenhum arquivo de produção em `src/`, banco, `.env.local` ou `package.json` foi alterado.

---

## Resumo das Alterações

1. **`scripts/test-register-etapa9-1-13.mjs`:**
   - Adicionado mock de `@/lib/supabase/client` via `registerHooks` com armadilhas em `from()` e `rpc()`.
   - Adicionado helper `makeTrapAuthClient()` com armadilhas `from()` e `rpc()`, aplicado em todos os cenários de cadastro (Tests 7, 8, 9, 10 e 12).
   - Substituído `stripComments()` por scanner de máquina de estados (preservando `'...'`, `"..."` e `` `...` `` com `//` internos).
   - Ampliado `assertNoManualProfileWriteInSource()` para detectar `.from("profiles")` e `.(insert|upsert|rpc)(`.
   - Adicionados testes negativos no Test 12b.
2. **`scripts/test-login-etapa9-1-14.mjs`:**
   - Adicionado `makeAuthFailTrap()` com armadilha explícita para `fetchSessionContext()` nos casos `invalid_email` e `password_too_short` (Test 11).
   - Adicionado `assertNoLoginSuccessOrRedirect()` para todos os cenários de erro/suspensão.
   - Adicionados testes negativos no Test 11b.
3. **`scripts/test-session-endpoint-etapa9-1-18-4.mjs`:**
   - Ampliado Scenario 4 (`connection_error`) para os subcasos `4a` (`auth.getUser()` lança exceção), `4b` (`profileError` retornado) e `4c` (consulta ao perfil lança exceção), validando HTTP `503`, `Cache-Control: no-store` e ausência de vazamento de strings internas sensíveis (`assertConnectionErrorContract()`).
   - Adicionados testes negativos no Scenario 7.
