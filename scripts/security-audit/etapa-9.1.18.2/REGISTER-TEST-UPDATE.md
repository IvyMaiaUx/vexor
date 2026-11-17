# REGISTER TEST UPDATE — ETAPA 9.1.18.2

Arquivo atualizado: `scripts/test-register-etapa9-1-13.mjs`  
Data: 2026-11-14

---

## 1. Diagnóstico

Os testes 1 a 11 do script `scripts/test-register-etapa9-1-13.mjs` continuavam válidos e passando (integração `registerWithSupabase`, metadados compatíveis com `handle_new_user`, callback/redirect seguro, ausência de criação manual de perfil, tratamento de erros, estado `confirmation_required`, anti-enumeração e ausência de `service_role`/`localStorage`).

A falha ocorria exclusivamente no **Test 12**:
- Asserção antiga: `assert.match(loginCode, /signInWithIdentifier/);` em `src/app/login/page.tsx`.
- Motivo da obsolescência: na Etapa 9.1.14, `src/app/login/page.tsx` passou a utilizar `loginWithSupabase` para o formulário real e `signInWithProfile` + `DEMO_PROFILES` para o simulador demo.

---

## 2. Atualização Aplicada (Test 12)

Mantendo o objetivo de verificar a preservação do fluxo simulado sem mascarar a arquitetura atual, o Test 12 foi atualizado para validar:

- `DEMO_PROFILES` e `signInWithProfile` presentes em `src/features/auth/use-auth-store.ts`.
- `loginWithSupabase`, `DEMO_PROFILES` e `signInWithProfile` presentes em `src/app/login/page.tsx`.

---

## 3. Resultado

`node scripts/test-register-etapa9-1-13.mjs` passou integralmente (Tests 1–12, **exit code 0**).
