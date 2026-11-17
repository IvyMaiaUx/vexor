# INSERT GUARD VALIDATION — ETAPA 9.1.18.4.2

Achado corrigido: `MÉDIO-01`  
Arquivo: `scripts/test-register-etapa9-1-13.mjs`

---

## Caminhos de Escrita Cobertos

1. **Via `authClient` injetado (`makeTrapAuthClient`):**
   - Aplicado em **todos** os cenários de `registerWithSupabase`: `network_error` (Test 7), `confirmation_required` (Test 8), `authenticated` (Test 9), anti-enumeração (Test 10), `rate_limited`, `weak_password` e `signup_failed` (Test 12).
   - Qualquer chamada a `authClient.from(...)` ou `authClient.rpc(...)` lança erro imediato.
2. **Via `createClient()` direto (`@/lib/supabase/client` interceptado em `registerHooks`):**
   - Qualquer tentativa do serviço importar e chamar `createClient().from(...)` ou `createClient().rpc(...)` lança erro imediato em runtime.
3. **Verificação estática com remoção segura de comentários (`assertNoManualProfileWriteInSource`):**
   - Após `stripComments()` (máquina de estados), verifica ausência de `.from("profiles")` / `.from('profiles')` / `.from(\`profiles\`)` e `.(insert|upsert|rpc)(` em `src/features/auth/register-service.ts` e `src/app/register/page.tsx`.
