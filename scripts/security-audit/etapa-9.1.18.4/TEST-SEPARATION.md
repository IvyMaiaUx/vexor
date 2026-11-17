# TEST SEPARATION — ETAPA 9.1.18.4 (ETAPA A)

Data: 2026-11-14  
Achado tratado: `MÉDIO-01` (mistura de responsabilidades entre suítes de cadastro e login)

---

## 1. O que foi removido de `scripts/test-register-etapa9-1-13.mjs`

O Test 12 original lia `src/app/login/page.tsx` e `src/features/auth/use-auth-store.ts` para verificar `loginWithSupabase`, `DEMO_PROFILES` e `signInWithProfile` dentro da suíte de cadastro.

Essas verificações pertencem ao contrato de **login** e foram removidas de `scripts/test-register-etapa9-1-13.mjs`, que agora concentra-se exclusivamente no contrato de cadastro (`validateRegistrationInput`, `registerWithSupabase`, `emailRedirectTo`, metadados para `handle_new_user()`, anti-enumeração, tratamento de erros e proteção contra `INSERT` manual de perfil).

---

## 2. Destino das asserções removidas (`scripts/test-login-etapa9-1-14.mjs`)

As verificações de separação entre login real e modo demo foram incorporadas ao **Test 10** de `scripts/test-login-etapa9-1-14.mjs`:

- `login-service.ts` (`loginWithSupabase`) não referencia `DEMO_PROFILES` nem realiza `.insert(`.
- `use-auth-store.ts` mantém `DEMO_PROFILES` e `signInWithProfile`.
- `src/app/login/page.tsx` utiliza `loginWithSupabase` para o formulário real e mantém `DEMO_PROFILES` / `signInWithProfile` exclusivamente nos botões de demonstração (somado ao Test 8 que garante ausência de `signInWithIdentifier(`).
