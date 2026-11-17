# REGISTER AUDIT — ETAPA 9.1.18.3

Arquivo auditado: `scripts/test-register-etapa9-1-13.mjs`  
Implementação comparada: `src/features/auth/register-service.ts`, `src/app/register/page.tsx`, `src/app/auth/callback/route.ts`, `src/lib/security/redirect.ts`  
Data: 2026-11-14

---

## 1. Checklist de Verificação do Cadastro

| Requisito | Status na Implementação Atual | Cobertura em `test-register-etapa9-1-13.mjs` | Observação |
| --- | --- | --- | --- |
| Uso de `supabase.auth.signUp()` | Sim (`registerWithSupabase`) | **Coberto** (Tests 7–10 via `authClient` mock) | Valida parâmetros passados a `signUp()`. |
| Metadados compatíveis com `handle_new_user()` | Sim (`username`, `display_name`, `preferred_locale`, sem `role`) | **Coberto** (Test 8: `assert.deepEqual` + `"role" in data === false`) | Garante que o cliente não envia `role`. |
| `emailRedirectTo` e callback seguro | Sim (`${origin}/auth/callback?next=${encodeURIComponent(safeNext)}` + `getSafeRedirectPath`) | **Coberto** (Test 8 testa open-redirect `https://evil.com/phish` -> `/catalog`) | O callback PKCE em `src/app/auth/callback/route.ts` é testado em `test-password-recovery-etapa9-1-16.mjs`. |
| Ausência de inserção manual de perfil | Sim (sem `.from("profiles").insert(...)`) | **Parcial** (mock `authClient` não expõe `.from()`, mas não há asserção explícita contra `.insert(` em `register-service.ts`) | Ver achado **BAIXO** em `TEST-QUALITY-REVIEW.md`. |
| Limites e consistência dos dados | Sim (`validateRegistrationInput`, `displayName.trim().slice(0, 60)`) | **Coberto** (Tests 1–6) | Cobre e-mail, senha curta, confirmação divergente e `displayName` vazio/60/61+. |
| Tratamento de erros | Sim (`network_error`, `rate_limited`, `weak_password`, `signup_failed`) | **Parcial** (Test 7 cobre `network_error`; não cobre `rate_limited`, `weak_password`, `signup_failed`) | Ver achado **BAIXO**. |
| Estado `confirmation_required` e anti-enumeração | Sim (quando `!data.session`, `user_already_exists` ou `identities: []`) | **Coberto** (Tests 8 e 10) | Confirma resposta neutra `confirmation_required`. |
| Sem `service_role` ou senha em `localStorage` | Sim | **Coberto** (Test 11) | Varredura estática em `register/page.tsx` e `register-service.ts`. |

---

## 2. Auditoria Específica do Test 12 (Atualizado na Etapa 9.1.18.2)

Trecho em `scripts/test-register-etapa9-1-13.mjs` (linhas 199–207):
```js
const storeCode = fs.readFileSync(path.join(rootDir, "src/features/auth/use-auth-store.ts"), "utf8");
const loginCode = fs.readFileSync(path.join(rootDir, "src/app/login/page.tsx"), "utf8");
assert.match(storeCode, /DEMO_PROFILES/);
assert.match(storeCode, /signInWithProfile/);
assert.match(loginCode, /loginWithSupabase/);
assert.match(loginCode, /DEMO_PROFILES/);
assert.match(loginCode, /signInWithProfile/);
```

**Parecer técnico:**
- **Coerência com a implementação atual:** Sim — os identificadores correspondem exatamente ao estado atual de `use-auth-store.ts` e `src/app/login/page.tsx`.
- **Avaliação crítica (Achado MÉDIO):**
  1. **Mistura de responsabilidades:** o Test 12 pertence historicamente à verificação de preservação do modo demo, mas lê `src/app/login/page.tsx` dentro da suíte de **cadastro** (`9.1.13`), misturando verificação de login em arquivo de cadastro.
  2. **Verificação puramente lexical:** `assert.match` apenas confirma que as strings existem no arquivo, podendo passar mesmo se `loginWithSupabase` estivesse apenas importado sem ser chamado no `handleSubmit` ou se `DEMO_PROFILES` fosse usado como fallback indevido. (Esse risco é mitigado indiretamente pelo Test 8 de `test-login-etapa9-1-14.mjs`, que garante que `signInWithIdentifier(` não está mais em `login/page.tsx`, e pelos testes da Etapa `9.1.16`).
