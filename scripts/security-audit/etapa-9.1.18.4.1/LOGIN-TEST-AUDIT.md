# LOGIN TEST AUDIT — ETAPA 9.1.18.4.1

Arquivo auditado: `scripts/test-login-etapa9-1-14.mjs`  
Implementação comparada: `src/features/auth/login-service.ts`, `src/app/login/page.tsx`, `src/features/auth/use-auth-store.ts`  
Data: 2026-11-14

---

## 1. Cobertura Comportamental dos Cenários de Login (`loginWithSupabase`)

| Cenário | Entrada / Mock | Resultado e Efeitos Verificados |
| --- | --- | --- |
| `invalid_email` (Test 11) | `email: "not-an-email"` | Retorna `{ status: "error", errorCode: "invalid_email" }` e `authCalledOnInvalid === false` (não chama `signInWithPassword`). |
| `password_too_short` (Test 11) | `password: "short"` | Retorna `{ status: "error", errorCode: "password_too_short" }` e `authCalledOnInvalid === false` (não chama Supabase Auth). |
| `rate_limited` (Test 11) | `signInWithPassword` retorna `429` | Retorna `{ status: "error", errorCode: "rate_limited" }`; `fetchSessionContext` lança erro se chamado. |
| `authenticated: false` na sessão (Test 11) | `signInWithPassword` ok, `fetchSessionContext` retorna `authenticated: false` | Retorna `{ status: "error", errorCode: "invalid_credentials" }`, sem `profile` e sem `safeRedirectPath`. |
| Perfil ausente (Test 4) | `fetchSessionContext` retorna `profile: null` | Retorna `{ status: "error", errorCode: "profile_missing" }`. |
| Conta suspensa (Test 5) | `profile.is_suspended: true`, `nextPath: "/admin"` | Retorna `status: "suspended"`, `profile.isSuspended: true`, sem `safeRedirectPath`. |
| Credenciais inválidas (Test 2) | `signInWithPassword` retorna `invalid_credentials` | Retorna `{ status: "error", errorCode: "invalid_credentials" }`; `fetchSessionContext` não é chamado. |
| Redirect externo (Test 7) | `nextPath: "https://evil.com/phish"` | Sanitizado para `safeRedirectPath: "/catalog"`. |

---

## 2. Separação entre Login Real e `DEMO_PROFILES` (`MÉDIO-02`)

- O Test 10 confirma que `login-service.ts` não referencia `DEMO_PROFILES` nem `.insert(`, e que `login/page.tsx` e `use-auth-store.ts` contêm `loginWithSupabase`, `DEMO_PROFILES` e `signInWithProfile` (somado ao Test 8 que impede `signInWithIdentifier(` em `login/page.tsx`).
- **Limitação (`MÉDIO-02`):** `src/app/login/page.tsx` não é renderizado/executado em runtime neste script; as verificações em `login/page.tsx` (Tests 8 e 10) permanecem estáticas/lexicais.
- **Detalhe menor (`BAIXO-02`):** nos casos `invalidEmailRes` e `shortPwdRes` do Test 11, `fetchSessionContext` não é injetado com função armadilha explícita (embora o comportamento padrão falharia com `network_error` caso fosse chamado indevidamente).
