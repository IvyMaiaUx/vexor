# PASSWORD-RESET — Etapa 9.1.16

## 1. Implementação de `src/app/auth/reset-password/page.tsx`
- **Design e i18n:** Integrada ao tema cyber-grid do Vexor (`Header`, `Footer`, indicador de força e checklist de requisitos) com suporte completo a `pt-BR` e `en` em `src/lib/i18n/dictionaries.ts`.
- **Usabilidade e Acessibilidade:**
  - Botões `type="button"` com `aria-label` para mostrar/ocultar senha em ambos os campos (`new-password` e `confirm-password`).
  - Alertas de erro e de sessão inválida com `role="alert"`.
  - Estado de carregamento durante validação inicial (`verifyingSession`) e durante submissão (`isSubmitting` + `disabled={isSubmitting}`).
- **Segurança da Atualização (`updatePasswordWithSupabase`):**
  - Validação mínima de `8` caracteres (`MIN_PASSWORD_LENGTH`) e igualdade de confirmação no cliente e no serviço.
  - Confirmação obrigatória da sessão via `supabase.auth.getUser()` antes de `supabase.auth.updateUser({ password })`.
  - Tratamento explícito para `session_invalid` (token expirado/consumido/ausente), `weak_password`, `same_password`, `rate_limited` e `network_error`, sem incluir senha ou token nas mensagens de erro.
  - Nenhum dado sensível salvo em `localStorage`/`sessionStorage`; nenhuma alteração em `public.profiles`, `role` ou `username`.
  - Sincronização pós-sucesso via `refreshSession()` respeitando `single-flight` e `syncEpoch`, sem presumir encerramento automático de outras sessões ativas.
