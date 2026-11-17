# RECOVERY-SESSION-AUDIT — Etapa 9.1.16.1 (Análise Crítica)

## 1. Arquivos Inspecionados
- `src/features/auth/recovery-service.ts` (`validateRecoverySession`, `updatePasswordWithSupabase`)
- `src/app/auth/reset-password/page.tsx` (`ResetPasswordContent`, `useEffect`, `onAuthStateChange`)

## 2. Respostas Objetivas às 7 Questões Críticas

1. **Uma sessão comum de login pode acessar `/auth/reset-password` e redefinir a senha sem passar pelo fluxo de recuperação?**
   - **Sim (`REC-01`, Severidade Média).** `validateRecoverySession()` (`recovery-service.ts:144-166`) chama apenas `client.getUser()` e retorna `"valid"` para qualquer usuário autenticado (`data.user !== null`), sem verificar se a sessão possui contexto/AMR de recuperação (`amr` contendo `"recovery"`).
2. **A aplicação comprova o contexto de recuperação ou apenas verifica se existe uma sessão autenticada?**
   - Apenas verifica se existe uma sessão autenticada (`getUser()`).
3. **O estado `PASSWORD_RECOVERY` é preservado corretamente?**
   - Parcialmente: `onAuthStateChange` em `src/app/auth/reset-password/page.tsx:73-84` escuta `PASSWORD_RECOVERY`, mas não registra nem exige essa prova; apenas dispara `validateRecoverySession()` (`getUser()`), assim como faz para `SIGNED_IN`.
4. **Um refresh da página mantém o fluxo válido?**
   - Sim, pois `/auth/callback` grava os cookies SSR da sessão via `exchangeCodeForSession(code)` no servidor; após F5, `getUser()` continua validando o JWT dos cookies. *(Limitação PKCE: o link do e-mail precisa ser aberto no mesmo navegador/dispositivo onde `resetPasswordForEmail` gerou o `code_verifier`.)*
5. **O acesso direto à rota é bloqueado quando não existe sessão apropriada?**
   - Para usuários **não autenticados**, sim (`getUser()` retorna `null` -> `sessionStatus === "invalid"`, formulário não é renderizado). Para usuários **já autenticados com sessão comum**, não é bloqueado.
6. **O estado de recuperação pode ser falsificado por manipulação do frontend?**
   - Usuários não autenticados não conseguem falsificar a troca de senha no backend, pois `supabase.auth.updateUser()` exige JWT válido no servidor Supabase. Porém, usuários já logados não precisam falsificar nada para acessar o formulário.
7. **Uma sessão antiga pode ser confundida com uma sessão recém-criada para recuperação?**
   - **Sim (`REC-01`)**, pois `validateRecoverySession()` aceita qualquer sessão autenticada pré-existente no navegador.

## 3. Limitação de Verificação
- A verificação de `amr` (`supabase.auth.getClaims()` ou `mfa.getAuthenticatorAssuranceLevel()` / decode do claim `amr` no servidor) depende da estrutura de claims emitida pelo GoTrue no projeto remoto, não executada ao vivo nesta auditoria somente leitura.
