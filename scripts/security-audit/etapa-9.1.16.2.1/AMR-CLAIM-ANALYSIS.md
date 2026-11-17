# Etapa 9.1.16.2.1 — Análise da Claim `amr` (`REC-01`)

**Escopo inspecionado (READ-ONLY):**
- `src/features/auth/recovery-service.ts`
- `src/app/auth/reset-password/page.tsx`
- `src/app/auth/callback/route.ts`
- `node_modules/@supabase/auth-js/dist/module/lib/types.d.ts` (linhas 2027–2044)
- Documentação oficial do Supabase Auth (`getClaims`, JWT `amr` / `AMREntry`, Custom Access Token Hooks)

---

## 1. Estrutura da Claim `amr` no SDK e no Supabase Auth

No `@supabase/auth-js` instalado (`node_modules/@supabase/auth-js/dist/module/lib/types.d.ts`), o tipo `JwtPayload` define:

```ts
amr?: AMREntry[] | string[]
```

onde `AMREntry` contém `{ method: string; timestamp: number }`. Isso reflete os dois formatos aceitos pelo protocolo JWT/GoTrue:
1. Formato estruturado do Supabase GoTrue: `[{ method: "recovery", timestamp: <epoch> }]` (`AMREntry[]`)
2. Formato RFC 8176 compacto: `["recovery"]` (`string[]`)

---

## 2. Avaliação da Implementação em `recovery-service.ts`

### 2.1 `hasRecoveryAmrClaim(claims)`
- Verifica `Array.isArray(claims.amr) && claims.amr.length > 0`.
- Aceita ambos os formatos:
  - `entry === "recovery"` (para `string[]`)
  - `typeof entry === "object" && entry !== null && entry.method === "recovery"` (para `AMREntry[]`)
- Não usa correspondência por substring (`includes`), evitando falsos positivos (ex.: `"password_recovery_legacy"`).
- **Conclusão:** Suporte correto tanto para `AMREntry[]` quanto para `string[]`.

### 2.2 `validateRecoverySession(authClient?)`
1. Chama `authClient.getUser()` para confirmar sessão ativa e válida no servidor Supabase Auth (não confia apenas em storage local).
2. Chama `authClient.getClaims()` para obter as claims verificadas do JWT atual.
3. Valida:
   - Existência de `claims`.
   - Vínculo de identidade: `claims.sub === userData.user.id`.
   - Expiração: `typeof claims.exp === "number" ? claims.exp * 1000 > Date.now() : true`.
   - Presença da claim de recuperação via `hasRecoveryAmrClaim(claims)`.

### 2.3 Observações e Riscos Residuais
1. **Omissão de `exp` (Informativo / Baixo):** Se `claims.exp` não for numérico (ex.: em um mock ou token malformado sem `exp`), a expressão `typeof claims.exp === "number" ? ... : true` permite a passagem. Em JWTs reais emitidos pelo Supabase GoTrue, `exp` é obrigatório; contudo, exigir `typeof claims.exp === "number"` explicitamente seria mais defensivo.
2. **Custom Access Token Hooks:** O Supabase permite configurar um `custom_access_token_hook(event jsonb)` no PostgreSQL para alterar `claims -> 'amr'`. Caso o hook sobrescreva `amr` durante emissão ou refresh de token (por exemplo, substituindo por `[{ method: 'token_refresh', timestamp }]` ou injetando `'recovery'`), o comportamento da validação dependerá da integridade do hook no banco (que está fora do código da aplicação e sob controle administrativo do projeto Supabase).
3. **Sessão antiga com `amr: recovery`:** Enquanto a sessão de recuperação não expirar nem sofrer logout/revogação (ou tiver seu `amr` alterado no refresh), ela mantém `amr: recovery` (detalhado em `TOKEN-REFRESH-ANALYSIS.md`).

---

## 3. Fluxo no Callback e na Página `/auth/reset-password`

- `src/app/auth/callback/route.ts`: Identifica `isRecoveryFlow = searchParams.get("type") === "recovery"`, restringe o destino de sucesso ao próprio fluxo `/auth/reset-password` (via `getSafeRedirectPath`) e redireciona erros de `exchangeCodeForSession(code)` para `/auth/reset-password?error=recovery_link_invalid`.
- `src/app/auth/reset-password/page.tsx`:
  - Inicializa `sessionStatus` como `"invalid"` se `?error=recovery_link_invalid`, ou `"checking"` caso contrário.
  - Executa `validateRecoverySession()` no carregamento (`useEffect`) e nos eventos `PASSWORD_RECOVERY`, `SIGNED_IN` e `TOKEN_REFRESHED` do `onAuthStateChange`; muda para `"invalid"` em `SIGNED_OUT`.
  - O formulário de redefinição de senha só é renderizado quando `sessionStatus === "valid" && !isSuccess`.

---

## 4. Veredito sobre `REC-01`

A validação da claim `amr` foi implementada de forma sólida e aderente ao `@supabase/auth-js`, cobrindo `AMREntry[]`, `string[]`, vínculo `sub === user.id`, expiração `exp` e bloqueio preventivo na UI e em `updatePasswordWithSupabase()`. Permanecem apenas ressalvas inerentes ao ciclo de `TOKEN_REFRESHED` e à arquitetura do endpoint `/user` do GoTrue (documentadas nos relatórios específicos).
