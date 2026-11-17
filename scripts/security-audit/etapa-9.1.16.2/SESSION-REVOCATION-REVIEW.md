# SESSION-REVOCATION-REVIEW — Etapa 9.1.16.2 (`REC-04`)

## 1. Comportamento Documentado das Sessões Após Alteração de Senha
- **Sessão atual:** Permanece ativa após `updateUser({ password })` e é sincronizada com o servidor via `await refreshSession()` (`syncClientSessionFromServer()`), preservando `single-flight` e `syncEpoch`.
- **Refresh tokens de outros dispositivos:** Conforme documentação oficial do Supabase Auth, `updateUser({ password })` revoga os *refresh tokens* das demais sessões ativas do usuário em outros navegadores/dispositivos.
- **Access tokens (JWTs) já emitidos:** JWTs de acesso previamente emitidos em outros dispositivos continuam criptograficamente válidos até sua expiração natural (TTL típico de 5 a 60 minutos), mas não conseguem mais ser renovados após expirarem.
- **Decisão:** Não foi alterado o comportamento de logout após troca de senha sem necessidade comprovada; não se afirma que todas as sessões são encerradas instantaneamente.
