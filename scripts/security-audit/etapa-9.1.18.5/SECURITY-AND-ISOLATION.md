# Segurança e Isolamento dos Testes E2E — Etapa 9.1.18.5

## Medidas Implementadas

1. **Nenhuma credencial hardcoded ou versionada**
   - `e2e/helpers/env.ts` lê credenciais exclusivamente de variáveis de ambiente ou de `.env.e2e.local` (ignorado pelo `.gitignore`).
   - Nenhum teste registra (`console.log`) `E2E_EMAIL`, `E2E_PASSWORD`, tokens ou cookies.

2. **Travas contra disparo acidental de e-mails e mutação de senha**
   - `E2E_ALLOW_EMAILS=false` por padrão: impede execução de cadastro real com disparo de e-mail e solicitação real de recuperação de senha.
   - `E2E_ALLOW_PASSWORD_CHANGE=false` por padrão: impede alteração de senha de conta de teste.
   - Testes de validação de formulário no `/register`, `/login` e `/forgot-password` usam entradas inválidas interceptadas no client-side ou domínios `.invalid` (RFC 2606) quando necessário testar erro de autenticação.

3. **Restauração de dados de perfil**
   - `e2e/profile/profile-edit.spec.ts` lê `originalDisplayName`, `originalBio` e `originalLanguage` antes de editar e restaura os valores originais em bloco `try ... finally`, garantindo estado limpo mesmo em caso de falha intermediária.

4. **Execução sequencial controlada**
   - `workers: 1` e `fullyParallel: false` evitam conflitos de sessão simultânea no mesmo usuário de teste.

5. **Separação de responsabilidades**
   - Nenhum código de produção, migração, RLS, trigger, RPC ou `.env.local` foi modificado.
