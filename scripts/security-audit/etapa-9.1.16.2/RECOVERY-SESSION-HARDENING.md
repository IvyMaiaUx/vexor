# RECOVERY-SESSION-HARDENING — Etapa 9.1.16.2 (`REC-01`)

## 1. Causa Raiz do Achado `REC-01`
Na Etapa 9.1.16, `validateRecoverySession()` verificava apenas `supabase.auth.getUser()`. Embora isso comprovasse que havia um usuário autenticado, não comprovava que a sessão havia sido estabelecida pelo fluxo de recuperação de senha — permitindo que qualquer sessão comum de login (`amr: password`) acessasse `/auth/reset-password` e chamasse `updateUser({ password })`.

## 2. Solução Implementada (`src/features/auth/recovery-service.ts`)
- **`hasRecoveryAmrClaim(claims)`:**
  - Verifica explicitamente a claim `amr` (Authentication Method References) nos formatos oficiais suportados pelo SDK `@supabase/auth-js` (`JwtPayload.amr?: AMREntry[] | string[]`):
    - `entry === "recovery"` (RFC-8176)
    - `entry.method === "recovery"` (`AMREntry`)
  - Nunca usa substring matching improvisado.
- **`validateRecoverySession()`:**
  1. Valida identidade e sessão ativa no servidor Auth via `await client.getUser()`.
  2. Extrai e verifica as claims assinadas do JWT via `await client.getClaims()`.
  3. Confirma `claims.sub === userData.user.id`.
  4. Confirma que `claims.exp` não expirou (`claims.exp * 1000 > Date.now()`).
  5. Exige `hasRecoveryAmrClaim(claims) === true`.
- **`src/app/auth/reset-password/page.tsx`:**
  - `onAuthStateChange` escuta `PASSWORD_RECOVERY`, `SIGNED_IN` e `TOKEN_REFRESHED`, mas sempre delega a autorização para `validateRecoverySession()` (`getUser()` + `getClaims()`).
  - Nunca confia isoladamente em parâmetro `type=recovery`, variável React ou estado local.
  - `updatePasswordWithSupabase()` reexecuta `validateRecoverySession()` imediatamente antes de `updateUser({ password })`.
