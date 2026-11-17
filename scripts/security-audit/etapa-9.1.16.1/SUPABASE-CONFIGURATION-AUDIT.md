# SUPABASE-CONFIGURATION-AUDIT — Etapa 9.1.16.1

## 1. Documento Inspecionado
- `scripts/security-audit/etapa-9.1.16/SUPABASE-CONFIGURATION.md`

## 2. Avaliação das Configurações Documentadas
O documento cobre corretamente os pontos manuais exigidos no painel Supabase:
1. **Authentication -> URL Configuration -> Site URL:** URL base do ambiente (`http://localhost:3000` ou domínio HTTPS de produção).
2. **Authentication -> URL Configuration -> Redirect URLs:** Allowlist incluindo `/auth/callback` (e compatibilidade com `?type=recovery&next=%2Fauth%2Freset-password`).
3. **Expiração dos links de recuperação:** Configuração de expiração do token de recuperação no projeto Supabase (padrão típico de 1 hora / 3600s).
4. **Email Templates -> Reset Password:** Uso de `{{ .ConfirmationURL }}` preservando o `redirect_to` e configuração do provedor SMTP/rate limits.

## 3. Observação Adicional Documentada (`REC-06`, Informativa)
- **Restrição PKCE entre navegadores/dispositivos:** Conforme documentação oficial do Supabase Auth para PKCE/SSR, o `code_verifier` é armazenado no navegador onde `resetPasswordForEmail()` foi chamado. Se o usuário abrir o link do e-mail em outro navegador ou dispositivo, `exchangeCodeForSession()` falhará.
- **Status:** Nenhuma configuração remota foi verificada ou alterada nesta auditoria (somente leitura local).
