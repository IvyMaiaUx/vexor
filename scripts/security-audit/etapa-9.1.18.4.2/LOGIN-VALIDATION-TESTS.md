# LOGIN VALIDATION TESTS — ETAPA 9.1.18.4.2

Achado corrigido: `BAIXO-02`  
Arquivo: `scripts/test-login-etapa9-1-14.mjs` (Tests 11 e 11b)

---

## Cobertura Fortalecida

1. **`invalid_email` e `password_too_short`:**
   - Utilizam `makeAuthFailTrap(invalidFlags)` com armadilhas tanto para `authClient.signInWithPassword()` quanto para `fetchSessionContext()`.
   - Confirmam `invalidFlags.authCalled === false` e `invalidFlags.sessionFetched === false`.
2. **Demais cenários (`rate_limited`, `authenticated: false`, `invalid_credentials`, `profile_missing`, `suspended`):**
   - Todos passam por `assertNoLoginSuccessOrRedirect(res)`, garantindo `res.status !== "authenticated"`, `"safeRedirectPath" in res === false` e ausência de `profile` em estados `"error"`.
