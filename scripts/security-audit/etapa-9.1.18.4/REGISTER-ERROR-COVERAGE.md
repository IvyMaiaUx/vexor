# REGISTER ERROR COVERAGE — ETAPA 9.1.18.4 (ETAPAS D e E)

Data: 2026-11-14  
Achados tratados: `BAIXO-01` e `BAIXO-02`  
Arquivo: `scripts/test-register-etapa9-1-13.mjs` (contrato: `src/features/auth/register-service.ts`)

---

## 1. Proteção contra INSERT Manual de Perfil (Etapa D — Test 11 e Test 12)

- **Verificação estática sem falsos positivos de comentários:** `stripComments()` remove comentários de `src/features/auth/register-service.ts` e `src/app/register/page.tsx` antes de validar ausência de `.from("profiles")` e `.insert(`.
- **Verificação comportamental:** no Test 12, o mock `authClient` injeta um método armadilha `from()` que lança erro caso seja chamado, garantindo que `registerWithSupabase()` interage exclusivamente com `auth.signUp()` e delega a criação de perfil à trigger `handle_new_user()`.
- **Metadados:** o Test 8 continua validando envio apenas de `username`, `display_name` e `preferred_locale` (sem `role`) e `emailRedirectTo` sanitizado.

---

## 2. Cobertura de Erros e Estados de Cadastro (Etapa E — Tests 7, 8, 10 e 12)

- **Rate limit (`rate_limited`):** simulado retorno HTTP `429` (`over_request_rate_limit`) -> `{ status: "error", errorCode: "rate_limited" }`.
- **Senha fraca (`weak_password`):** simulado retorno `422` (`weak_password`) -> `{ status: "error", errorCode: "weak_password" }`.
- **Falha de cadastro (`signup_failed`):** simulado erro `unexpected_failure` -> `{ status: "error", errorCode: "signup_failed" }`.
- **Confirmação de e-mail pendente (`confirmation_required`):** validado no Test 8 com `session: null` e no Test 10 com anti-enumeração.
- **Falha de rede (`network_error`):** validado no Test 7 por exceção no `signUp()`.
