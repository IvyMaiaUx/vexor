# Etapa 9.1.16.2.2 — Plano de Implementação (`AUD-01`)

## 1. Objetivo

Corrigir o achado **AUD-01** da auditoria da Etapa 9.1.16.2.1 de forma pontual, controlada e sem refatorações estruturais:
- **AUD-01A:** Tornar a validação de `claims.exp` (e de identidade `claims.sub`) estritamente *fail-closed* em `validateRecoverySession()`.
- **AUD-01B:** Avaliar e garantir o comportamento seguro de `amr` durante eventos `TOKEN_REFRESHED`, sem confiar em armazenamento local, estado React isolado ou eventos não verificados (`PASSWORD_RECOVERY` / `TOKEN_REFRESHED` por si sós).
- **Custom Access Token Hooks:** Documentar impacto, garantias e limites no Supabase Auth.

## 2. Alterações de Código Planejadas e Executadas

1. `src/features/auth/recovery-service.ts`:
   - Adicionada a função exportada `isValidFutureExpClaim(exp: unknown, nowMs?: number): boolean`.
   - Atualizada `validateRecoverySession(authClient?, options?: { nowMs?: number })` para:
     - Exigir `claims` objeto não nulo.
     - Exigir `claims.sub` string não vazia idêntica a `userData.user.id` (*fail-closed* quando `sub` estiver ausente).
     - Exigir `isValidFutureExpClaim(claims.exp, options?.nowMs ?? Date.now())` (*fail-closed* para ausente, `undefined`, `null`, string numérica, string inválida, `0`, negativo, decimal, `NaN`, `Infinity`, expirado ou igual ao instante atual).
     - Manter `hasRecoveryAmrClaim(claims)` para `AMREntry[]` e `string[]`.
2. `scripts/test-password-recovery-etapa9-1-16.mjs`:
   - Adicionados testes unitários e de integração offline cobrindo todos os casos de `exp`, `amr` (incluindo renovação simulada com preservação e perda de `amr`), `sub` e erros de `getUser()` / `getClaims()`.

## 3. Itens Intactos (Fora do Escopo)

- Fluxo PKCE em `src/app/auth/callback/route.ts` preservado.
- Fluxo de login, cadastro e `DEMO_PROFILES` preservados.
- Nenhuma alteração em migrations, RLS, policies, triggers, RPCs, `.env.local` ou ACLs.
