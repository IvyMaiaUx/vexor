# IMPLEMENTATION-PLAN — Etapa 9.1.16.2

## 1. Diagnóstico do SDK Instalado (`@supabase/auth-js`)
- `node_modules/@supabase/auth-js/dist/module/GoTrueClient.d.ts` fornece `getClaims(jwt?: string, options?: ...)` retornando `{ data: { claims: JwtPayload } | null, error }`.
- `node_modules/@supabase/auth-js/dist/module/lib/types.d.ts` define `JwtPayload.amr?: AMREntry[] | string[]`, suportando formato RFC-8176 (`["recovery"]`) e formato objeto (`[{ method: "recovery", timestamp: number }]`).

## 2. Correções Planejadas
1. **REC-01 (`src/features/auth/recovery-service.ts` & `src/app/auth/reset-password/page.tsx`):**
   - Atualizar `validateRecoverySession()` para exigir:
     1. Identidade e sessão ativa via `getUser()`.
     2. Claims verificadas via `getClaims()` com `claims.sub === user.id`, `exp` não expirado e `amr` contendo explicitamente `"recovery"` (`AMREntry` com `method === "recovery"` ou string `"recovery"`).
   - Rejeitar qualquer sessão comum (`password`, `oauth`, etc.), sessão sem `amr` ou sessão com `sub` divergente.
   - Em `src/app/auth/reset-password/page.tsx`, validar sempre via `validateRecoverySession()` sem confiar isoladamente em `PASSWORD_RECOVERY` ou `type=recovery`.
2. **REC-02 (`src/features/auth/recovery-service.ts`):**
   - Revisar `429` (`rate_limited`) mantendo mensagem neutra sem expor detalhes internos do GoTrue.
3. **REC-03 (`src/app/auth/callback/route.ts`):**
   - Confirmar que `type=recovery` apenas seleciona o destino `/auth/reset-password` e não concede autorização.
4. **REC-05 (`scripts/test-password-recovery-etapa9-1-16.mjs` & `scripts/test-recovery-ui-etapa9-1-16-2.mjs`):**
   - Cobrir todos os cenários positivos e negativos de `amr`/claims, `same_password`, `weak_password`, exceção no callback, e testes comportamentais de `ForgotPasswordPage` e `AuthResetPasswordPage`, documentando a ausência de `jsdom`/`@testing-library/react`.
5. **REC-04 e REC-06:** Documentar sessões pós-troca e restrição PKCE cross-browser.
