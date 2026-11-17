# Preparação da Conta Dedicada `member` — Etapa 9.1.18.6.2

## Status Atual
- **Aguardando criação manual da conta `member` pelo usuário no Supabase Dashboard** (Parada Condicional da Fase 2).
- Nenhuma conta foi criada via scripts, `service_role`, SQL direto ou `signUp` automatizado.

## Passo a Passo para o Usuário

1. **Criar a conta dedicada no Supabase Dashboard:**
   - Acesse o projeto **Vexor (`zcjudcbckcxwnfnrjfte`)** → **Authentication** → **Users** → **Add user** → **Create new user**.
   - Informe um e-mail dedicado exclusivo para testes (diferente da conta `admin`).
   - Defina uma senha forte exclusiva para testes.
   - Marque **Auto Confirm User** (e-mail confirmado sem disparar e-mail de cadastro).
   - Confirme a criação. O trigger oficial `on_auth_user_created` (`handle_new_user()`) criará automaticamente o registro em `public.profiles` com `role = 'member'` e `is_suspended = false`.

2. **Configurar as credenciais localmente em `.env.e2e.local`:**
   - Crie o arquivo `.env.e2e.local` na raiz do projeto (protegido pelo `.gitignore`):
     ```env
     E2E_BASE_URL=http://localhost:3000
     E2E_EMAIL=<email-da-conta-member>
     E2E_PASSWORD=<senha-da-conta-member>
     E2E_ALLOW_EMAILS=false
     E2E_ALLOW_PASSWORD_CHANGE=false
     ```
   - **Não compartilhe a senha ou e-mail no chat.**

3. **Próximo passo:**
   - Após criar a conta no Dashboard e salvar `.env.e2e.local`, avise no chat para prosseguirmos com as Fases 3 a 9 (validação de identidade, `T1`, `T2`, `T3` com restauração, checagem final e validações locais).
