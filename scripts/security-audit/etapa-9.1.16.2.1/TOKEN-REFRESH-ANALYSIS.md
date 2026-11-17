# Etapa 9.1.16.2.1 — Análise de `TOKEN_REFRESHED` e Ciclo de Vida da Sessão de Recuperação

**Escopo:** Comportamento da claim `amr` após `TOKEN_REFRESHED`, impacto de Custom Access Token Hooks e risco de persistência de sessão antiga de recuperação.

---

## 1. Comportamento Padrão do Supabase Auth em `TOKEN_REFRESHED`

1. Quando o usuário abre o link de recuperação de senha (`type=recovery`), o GoTrue emite um Access Token (JWT) e um Refresh Token. O JWT inicial possui `amr` contendo `recovery` (ex.: `[{ method: "recovery", timestamp: ... }]`).
2. Quando o SDK executa `refreshSession()` ou o auto-refresh dispara o evento `TOKEN_REFRESHED`:
   - Por padrão no Supabase GoTrue, o novo Access Token preserva o método de autenticação (`amr`) associado à sessão original, a menos que um fator adicional (como MFA) ou um hook altere as claims.
   - Assim, durante o tempo de vida dessa sessão de recuperação, um refresh legítimo continua passando em `validateRecoverySession()`.
3. Em `src/app/auth/reset-password/page.tsx`, `onAuthStateChange` escuta `PASSWORD_RECOVERY`, `SIGNED_IN` e `TOKEN_REFRESHED`, reexecutando `validateRecoverySession()` em todos eles.

---

## 2. Impacto de Custom Access Token Hooks

- Caso o projeto Supabase utilize um **Custom Access Token Hook** (`public.custom_access_token_hook`), o evento recebido durante um refresh traz `authentication_method: 'token_refresh'`.
- **Risco operacional:** Se um hook substituir `claims.amr` pelo método do evento (`token_refresh`) em vez de preservar o `amr` anterior da sessão, `validateRecoverySession()` passará a retornar `session_invalid` logo após o primeiro `TOKEN_REFRESHED`, interrompendo o usuário caso o token expire enquanto ele digita a nova senha.
- **Risco de segurança (privilégio excessivo no hook):** Um hook mal implementado poderia injetar `recovery` em sessões normais; por isso, hooks no banco devem ser tratados como parte da fronteira de confiança do servidor Supabase.

---

## 3. Persistência de Sessão Antiga com Claim `recovery`

- Como `validateRecoverySession()` verifica `claims.sub === user.id`, `exp` e `hasRecoveryAmrClaim(claims)`, **uma sessão de recuperação antiga que ainda não foi encerrada (nem teve sua senha alterada/sessão revogada) e que ainda possua um refresh token válido** continuará apresentando `amr: recovery` após `TOKEN_REFRESHED`.
- Em termos práticos:
  - Isso não permite acesso anônimo nem troca de senha de terceiros.
  - Entretanto, se o usuário abrir o link de recuperação, não concluir a troca de senha, fechar a aba e retornar horas depois (com a mesma sessão ainda viva e renovável via refresh token), ele ainda poderá acessar `/auth/reset-password` até que a sessão expire, faça logout ou conclua a alteração de senha.
  - Após a troca de senha bem-sucedida, `AuthResetPasswordPage` mantém o fluxo de finalização (`isSuccess = true` e atualização/encerramento de sessão conforme implementado), impedindo reuso imediato do formulário na mesma tela.

---

## 4. Classificação

- **Severidade:** `BAIXO` / `INFORMATIVO` (`AUD-01`).
- **Conclusão:** O tratamento de `TOKEN_REFRESHED` em `AuthResetPasswordPage` está coerente com o comportamento padrão do Supabase Auth. A eventual perda da claim por Custom Access Token Hook ou a retenção de `amr: recovery` em sessão de recuperação não finalizada são comportamentos esperados da arquitetura GoTrue/JWT.
