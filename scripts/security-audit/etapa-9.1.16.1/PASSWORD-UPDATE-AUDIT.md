# PASSWORD-UPDATE-AUDIT — Etapa 9.1.16.1

## 1. Arquivos Inspecionados
- `src/features/auth/recovery-service.ts` (`updatePasswordWithSupabase`)
- `src/app/auth/reset-password/page.tsx` (`handleSubmit`)
- `src/features/auth/session-sync.ts` (`syncClientSessionFromServer`)

## 2. Verificação Ponto a Ponto
- **Uso de `updateUser({ password })`:** Invocado em `recovery-service.ts:193-195` somente após `validateRecoverySession()` retornar `"valid"`.
- **Validação de senha e correspondência:** Exige `newPassword.length >= 8` (`MIN_PASSWORD_LENGTH`) e `newPassword === confirmPassword` tanto na UI quanto no serviço.
- **Tratamento de erros:** Trata `session_invalid` (`401`/`403`/`session_not_found`/`session_expired`/`bad_jwt`), `weak_password`, `same_password`, `rate_limited` (`429`), `network_error` e `update_failed`, sem incluir senha ou token nas mensagens.
- **Submissões simultâneas:** `handleSubmit` em `src/app/auth/reset-password/page.tsx:125` bloqueia reentrada com `if (isSubmitting || sessionStatus !== "valid") return;` e `disabled={isSubmitting}`.
- **Armazenamento e logs:** Senha é limpa do estado React (`setPassword("")`, `setConfirmPassword("")`) após sucesso; nada é gravado em `localStorage`/`sessionStorage` ou logado.

## 3. Comportamento de Sessões Existentes (Documentação Oficial Supabase)
- Conforme documentação oficial do Supabase Auth (`updateUser`):
  - **Outras sessões do mesmo usuário:** Ao atualizar a senha via `updateUser({ password })`, o Supabase revoga automaticamente os *refresh tokens* de outras sessões/dispositivos ativos.
  - **Tokens já emitidos:** *Access Tokens* (JWTs) já emitidos em outros dispositivos permanecem criptograficamente válidos até sua expiração natural (tipicamente 5–60 minutos), mas não podem mais ser renovados.
  - **Sessão atual:** A sessão atual na página `/auth/reset-password` permanece ativa (a página chama `await refreshSession()` para sincronizar `useAuthStore` com `/api/auth/session`). Caso a política de produto exija encerrar a sessão de recuperação imediatamente após a redefinição (forçando novo login), seria necessário chamar `signOut()` após `updateUser()`.
