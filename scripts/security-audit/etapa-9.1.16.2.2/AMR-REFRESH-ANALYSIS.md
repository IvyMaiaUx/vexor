# Etapa 9.1.16.2.2 — Análise da Claim `amr` após Renovação (`AUD-01B`)

**Escopo analisado:**
- `src/features/auth/recovery-service.ts`
- `src/app/auth/reset-password/page.tsx`
- `src/app/auth/callback/route.ts`
- Documentação oficial do Supabase Auth e tipos de `@supabase/auth-js`

---

## 1. Comportamento por Etapa do Fluxo (Documentação e Código)

| Etapa do Fluxo | Comportamento Esperado / Observado | Fonte da Evidência |
| :--- | :--- | :--- |
| **Login comum** | JWT emitido pelo GoTrue contém `amr` com `password` (ou `oauth`, `magiclink`, etc.), sem `recovery`. `validateRecoverySession()` rejeita (`"invalid"`). | Doc. Supabase Auth + Código + Teste offline (`3a`, `3c`) |
| **Solicitação de recuperação** | `requestPasswordRecovery()` chama `resetPasswordForEmail()` com `redirectTo` apontando para `/auth/callback?type=recovery&next=%2Fauth%2Freset-password`. Não cria sessão. | Código (`recovery-service.ts`) + Teste offline (`1`) |
| **Callback de recuperação** | `GET /auth/callback` troca o `code` PKCE único via `exchangeCodeForSession(code)` no servidor e redireciona para `/auth/reset-password`. | Código (`callback/route.ts`) + Teste offline (`2`) |
| **Primeiro acesso a `/auth/reset-password`** | `useEffect` chama `validateRecoverySession()`, que consulta `getUser()` e `getClaims()` do JWT atual e exige `amr` com `"recovery"`, `sub === user.id` e `exp` futuro válido. | Código (`reset-password/page.tsx`) + Teste offline (`3g`) |
| **`TOKEN_REFRESHED`** | Refresh tokens no Supabase Auth são de uso único. Quando `onAuthStateChange` emite `TOKEN_REFRESHED`, `AuthResetPasswordPage` **não** assume que a sessão continua sendo de recuperação: ela reexecuta `validateRecoverySession()` sobre o novo JWT obtido via `getUser()`/`getClaims()`. | Doc. Supabase Auth + Código (`reset-password/page.tsx` linhas 79-86) + Simulação (`3j`) |
| **Atualização da senha** | `updatePasswordWithSupabase()` revalida `validateRecoverySession()` imediatamente antes de `updateUser({ password })`. Após sucesso, `AuthResetPasswordPage` marca `isSuccess = true` (ocultando o formulário) e chama `refreshSession()`. | Código (`recovery-service.ts`, `reset-password/page.tsx`) + Teste offline (`3h`) |
| **Nova autenticação após logout** | Nova autenticação por senha gera sessão com `amr: password`, que é rejeitada por `validateRecoverySession()`. | Doc. Supabase Auth + Teste offline (`3a`) |

---

## 2. Por que `TOKEN_REFRESHED` não é presumido como prova

1. A página `/auth/reset-password` escuta `PASSWORD_RECOVERY`, `SIGNED_IN` e `TOKEN_REFRESHED` apenas como **gatilhos de revalidação**, nunca como prova de autorização.
2. Em cada gatilho, `validateRecoverySession()` consulta `getUser()` e `getClaims()` no SDK oficial:
   - Se o JWT renovado mantiver `amr: recovery` (com `sub` e `exp` válidos), a sessão permanece `"valid"`.
   - Se o JWT renovado perder `amr: recovery` (por rotação, política do servidor ou Custom Access Token Hook), `validateRecoverySession()` retorna `"invalid"` e o formulário é imediatamente ocultado (*fail-closed*).
3. Não há armazenamento manual de tokens, flag permanente em `localStorage`, nem emissão própria de JWT.

---

## 3. Limitações Documentadas

- Em ambiente real com Supabase GoTrue, a preservação exata de `amr: recovery` após `refreshSession()` depende do servidor GoTrue e de eventuais Custom Access Token Hooks configurados no projeto remoto (não testado E2E contra o projeto remoto nesta etapa).
- Caso um Custom Access Token Hook remoto substitua `amr` por `token_refresh` durante um refresh, o comportamento *fail-closed* encerrará o formulário na UI em vez de conceder acesso indevido.
