# Plano de Testes E2E — Etapa 9.1.18.5

## Arquitetura da Suíte
- **Diretório:** `e2e/`
- **Configuração:** `playwright.config.ts` (projeto `chromium`, `workers: 1`, `fullyParallel: false`, `baseURL: http://localhost:3000` ou `E2E_BASE_URL`).
- **Isolamento de ambiente:** `e2e/helpers/env.ts` lê opcionalmente `.env.e2e.local` (ignorado no Git) sem exigir dependências extras.

## Cobertura Planejada

| Arquivo | Cenários | Pré-requisitos / Travas |
|---|---|---|
| `e2e/auth/register.spec.ts` | Renderização do formulário; validação de campos vazios; divergência de senhas e aceite ético sem envio; cadastro real com tela de confirmação | Cadastro real exige `E2E_ALLOW_EMAILS=true` e `E2E_SIGNUP_EMAIL` |
| `e2e/auth/login.spec.ts` | Renderização do formulário; validação client-side; erro genérico com credenciais inválidas; login real + verificação de `/api/auth/session` | Login real exige `E2E_EMAIL` e `E2E_PASSWORD` |
| `e2e/auth/logout.spec.ts` | Login real, clique no botão de logout, confirmação de `/api/auth/session` como `authenticated: false` e bloqueio posterior de `/admin` e `/cybercrime-research` | Exige `E2E_EMAIL` e `E2E_PASSWORD` |
| `e2e/auth/protected-routes.spec.ts` | Bloqueio anônimo de `/admin`, `/admin/users`, `/admin/audit` e `/cybercrime-research`; acesso público a `/`, `/login`, `/register`; ausência de dados privados em `/profile` anônimo | Nenhum (roda 100% offline/anônimo) |
| `e2e/auth/recovery.spec.ts` | Validação de e-mail inválido em `/forgot-password`; bloqueio de `?error=recovery_link_invalid`, acesso anônimo e sessão comum em `/auth/reset-password`; envio de e-mail e troca de senha | Sessão comum exige credenciais; envio de e-mail exige `E2E_ALLOW_EMAILS=true`; troca de senha exige `E2E_ALLOW_PASSWORD_CHANGE=true` |
| `e2e/profile/profile-edit.spec.ts` | Abertura do modal, verificação de `maxLength`, cancelamento com `dialog` sem salvar, edição de `displayName`/`bio`/`preferredLanguage`, persistência após `page.reload()` e restauração original | Exige `E2E_EMAIL` e `E2E_PASSWORD` |
