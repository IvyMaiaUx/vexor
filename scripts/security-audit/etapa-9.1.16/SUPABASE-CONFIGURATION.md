# SUPABASE-CONFIGURATION — Etapa 9.1.16

> **Nota:** Nenhuma configuração remota do Supabase foi alterada nesta etapa. Os itens abaixo devem ser conferidos manualmente no painel do Supabase Dashboard antes de testar o fluxo E2E real.

## 1. Configurações Necessárias no Supabase Dashboard

1. **Site URL (`Authentication -> URL Configuration -> Site URL`):**
   - Definir para a URL base da aplicação (ex.: `http://localhost:3000` em desenvolvimento local, ou domínio HTTPS oficial em produção).
2. **Redirect URLs Permitidas (`Authentication -> URL Configuration -> Redirect URLs`):**
   - Incluir explicitamente:
     - `http://localhost:3000/auth/callback` (desenvolvimento)
     - `https://<seu-dominio>/auth/callback` (produção)
   - Opcionalmente incluir padrão com wildcard de query se exigido pela versão do projeto, garantindo que `/auth/callback?type=recovery&next=%2Fauth%2Freset-password` seja aceito pela allowlist do GoTrue.
3. **Expiração dos Links de Recuperação (`Authentication -> Providers / Auth Settings` / `Email`):**
   - Verificar o tempo de expiração do token de recuperação (OTP/PKCE recovery expiry; padrão típico: `3600` segundos / 1 hora).
4. **Provedor de E-mail e Template (`Authentication -> Email Templates -> Reset Password`):**
   - Confirmar que o provedor SMTP (ou e-mail padrão em ambiente de teste) está ativo e dentro dos limites de rate limit.
   - Garantir que o template de **Reset Password** utilize `{{ .ConfirmationURL }}` (ou fluxo PKCE compatível com `/auth/callback`) sem alterar ou remover o parâmetro `redirect_to` enviado por `resetPasswordForEmail()`.
