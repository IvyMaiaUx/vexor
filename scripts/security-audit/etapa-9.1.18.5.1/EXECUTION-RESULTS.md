# Resultados da Execução E2E — Etapa 9.1.18.5.1

## Comando Executado
`npm run test:e2e` (`playwright test`)

## Resumo Quantitativo
- **Total de testes listados:** 20 testes em 6 arquivos
- **Aprovados:** **12**
- **Ignorados (skipped):** **7**
- **Falhos:** **1**
- **Duração total:** 45.2s

## Detalhamento por Cenário

### Aprovados (12)
1. `e2e/auth/login.spec.ts` — exibe os campos e botão de entrada na página de login (5.7s)
2. `e2e/auth/login.spec.ts` — valida campos vazios e formato inválido sem quebrar a página (1.8s)
3. `e2e/auth/protected-routes.spec.ts` — bloqueia rotas administrativas (`/admin`, `/admin/users`, `/admin/audit`) sem sessão ativa (8.0s)
4. `e2e/auth/protected-routes.spec.ts` — bloqueia `/cybercrime-research` sem sessão ativa (3.7s)
5. `e2e/auth/protected-routes.spec.ts` — permite acesso anônimo às rotas públicas `/`, `/login` e `/register` (5.8s)
6. `e2e/auth/protected-routes.spec.ts` — `/profile` não expõe dados privados sem sessão (3.6s)
7. `e2e/auth/recovery.spec.ts` — abre `/forgot-password` e valida e-mail inválido (2.4s)
8. `e2e/auth/recovery.spec.ts` — `/auth/reset-password` exibe bloqueio para link expirado ou inválido (2.6s)
9. `e2e/auth/recovery.spec.ts` — `/auth/reset-password` bloqueia acesso anônimo sem sessão de recuperação (2.4s)
10. `e2e/auth/register.spec.ts` — exibe todos os campos obrigatórios do formulário de cadastro (2.3s)
11. `e2e/auth/register.spec.ts` — valida campos obrigatórios e bloqueia envio quando inválido (1.6s)
12. `e2e/auth/register.spec.ts` — valida divergência de senhas e ausência de aceite ético sem enviar requisição (1.7s)

### Ignorados (7)
1. `e2e/auth/login.spec.ts` — realiza login válido, redireciona e mantém sessão ativa (`E2E_EMAIL` e `E2E_PASSWORD` ausentes)
2. `e2e/auth/logout.spec.ts` — realiza logout, limpa sessão e volta a bloquear rotas protegidas (`E2E_EMAIL` e `E2E_PASSWORD` ausentes)
3. `e2e/auth/recovery.spec.ts` — `/auth/reset-password` bloqueia sessão comum de login (`E2E_EMAIL` e `E2E_PASSWORD` ausentes)
4. `e2e/auth/recovery.spec.ts` — envia solicitação real de recuperação de senha (`E2E_ALLOW_EMAILS !== 'true'`)
5. `e2e/auth/recovery.spec.ts` — atualização real de senha em `/auth/reset-password` (`E2E_ALLOW_PASSWORD_CHANGE !== 'true'`)
6. `e2e/auth/register.spec.ts` — realiza cadastro real e exibe tela de confirmação de e-mail (`E2E_ALLOW_EMAILS !== 'true'` ou `E2E_SIGNUP_EMAIL` ausente)
7. `e2e/profile/profile-edit.spec.ts` — edita perfil, valida limites, cancela alteração e persiste alteração após reload com restauração (`E2E_EMAIL` e `E2E_PASSWORD` ausentes)

### Falho (1)
1. `[chromium] › auth\login.spec.ts:34:3 › Auth - Login (/login) › exibe erro genérico seguro ao tentar login com credenciais inválidas`

```text
Error: expect(locator).toBeVisible() failed

Locator: locator('div.text-rose-300, p.text-rose-400').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('div.text-rose-300, p.text-rose-400').first()

  at C:\Users\Ivy Maia\Desktop\cybersec-community-platform\e2e\auth\login.spec.ts:44:58
```
