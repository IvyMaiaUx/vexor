# REGISTER TEST AUDIT — ETAPA 9.1.18.4.1

Arquivo auditado: `scripts/test-register-etapa9-1-13.mjs`  
Implementação comparada: `src/features/auth/register-service.ts`, `src/app/register/page.tsx`  
Data: 2026-11-14

---

## 1. Auditoria da Proteção contra INSERT Manual de Perfil

O teste utiliza duas abordagens complementares:

1. **Inspeção estática (Test 11, linhas 190–208):** `stripComments()` remove `/*...*/` e `//...` de `register-service.ts` e `register/page.tsx` e verifica ausência de `.from("profiles")` e `.insert(`.
2. **Armadilha em runtime (Test 12, linhas 211–226):** passa um método `from()` que lança erro no `authClient` injetado em `rateLimitRes`.

**Avaliação crítica (`MÉDIO-01`):**
- **Escopo efetivo comprovado:** em `register-service.ts`, o serviço realmente usa apenas `authClient.signUp()` com `{ username, display_name, preferred_locale }` (sem `role`) e `emailRedirectTo` sanitizado por `getSafeRedirectPath()`.
- **Fragilidade da armadilha em runtime:**
  1. No Test 12, `from()` foi anexado apenas ao mock do caso `rateLimitRes` (onde `signUp()` retorna erro `429` antes de qualquer lógica pós-cadastro), e não aos casos `confirmation_required` (Test 8) ou `authenticated` (Test 9).
  2. Se `register-service.ts` importasse `createClient()` diretamente para chamar `.from("profiles").insert()`, o mock `authClient.from()` não interceptaria essa chamada — portanto a garantia contra `createClient().from("profiles").insert()` continua dependendo da inspeção estática do Test 11.
  3. `stripComments()` usa regex simples (`/\/\/.*$/gm`), que também removeria trechos após `//` dentro de literais de string (como URLs `"https://..."`), embora não invalide o arquivo atual.

---

## 2. Cobertura dos Cenários de Cadastro e Erros

| Cenário | Como é Testado | Resultado / Efeitos Verificados |
| --- | --- | --- |
| `invalid_email` | `validateRegistrationInput` (Tests 1–6) | Retorna `errors.email === "INVALID_EMAIL"` (não testado diretamente em `registerWithSupabase` porque a validação de formato ocorre em `RegisterPage` via `validateRegistrationInput`). |
| `password_too_short` | `validateRegistrationInput` (Tests 1–6) | Retorna `errors.password === "PASSWORD_LEN"`. |
| `rate_limited` | `registerWithSupabase` (Test 12) | Retorna `{ status: "error", errorCode: "rate_limited" }`. |
| `weak_password` | `registerWithSupabase` (Test 12) | Retorna `{ status: "error", errorCode: "weak_password" }`. |
| `signup_failed` | `registerWithSupabase` (Test 12) | Retorna `{ status: "error", errorCode: "signup_failed" }`. |
| Confirmação pendente (`session: null`) | `registerWithSupabase` (Test 8 e 10) | Retorna `status: "confirmation_required"`, `safeRedirectPath: "/catalog"`, metadados sem `role`. |
| Falha de rede | `registerWithSupabase` (Test 7) | Exceção em `signUp()` retorna `{ status: "error", errorCode: "network_error" }`. |

- **Limitação (`BAIXO-03`):** `src/app/register/page.tsx` não é renderizado/executado em runtime neste script (não valida integração DOM de exibição da tela de confirmação ou bloqueio de duplo clique em runtime).
