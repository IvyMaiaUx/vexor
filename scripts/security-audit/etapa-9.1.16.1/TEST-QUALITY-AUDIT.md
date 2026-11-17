# TEST-QUALITY-AUDIT — Etapa 9.1.16.1

## 1. Arquivo Inspecionado
- `scripts/test-password-recovery-etapa9-1-16.mjs` (356 linhas)

## 2. Classificação dos Testes Existentes

| Bloco | Classificação | O que Exercita Realmente |
|-------|---------------|--------------------------|
| Solicitação (`requestPasswordRecovery`) | Integração com mocks | Executa a função real com mock de `resetPasswordForEmail`; valida e-mail inválido, anti-enumeração, `redirectTo` seguro, `429` e falha de rede. |
| Callback (`GET /auth/callback`) | Integração com mocks | Executa o handler `GET` real de `src/app/auth/callback/route.ts` com `NextRequest` real e mock de `exchangeCodeForSession`; valida `type=recovery`, código expirado, open redirect e preservação de confirmação de e-mail. |
| Redefinição (`validateRecoverySession` & `updatePasswordWithSupabase`) | Integração com mocks | Executa as funções reais com mocks de `getUser`/`updateUser`; valida tamanho mínimo, divergência, sessão ausente, token expirado (`401`), falha de rede e sucesso. |
| Regressão (`loginWithSupabase` & `registerWithSupabase`) | Integração com mocks | Executa ambos os serviços reais com mocks offline. |
| Teste E2E real com Supabase | **Ausente (0 testes)** | Nenhum teste envia e-mail real ou troca código real contra GoTrue remoto. |

## 3. Lacunas de Cobertura Identificadas (`REC-05`, Severidade Média)
1. **Sessão comum vs sessão de recuperação:** Não há teste validando rejeição de sessão comum em `/auth/reset-password` (reflete `REC-01`).
2. **Componentes React de UI (`ForgotPasswordPage` e `AuthResetPasswordPage`):** Não há teste executando os componentes React para validar `disabled={isSubmitting}` contra duplo clique, toggle mostrar/ocultar senha e ocultação do formulário quando `sessionStatus === "invalid"`.
3. **Cenários não exercitados em `recovery-service.ts`:** `same_password` e `weak_password` em `updatePasswordWithSupabase()`, e `throwExchange = true` no mock de `auth/callback/route.ts`.
