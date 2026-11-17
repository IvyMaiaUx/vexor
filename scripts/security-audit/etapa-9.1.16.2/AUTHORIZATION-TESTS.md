# AUTHORIZATION-TESTS — Etapa 9.1.16.2 (`REC-05`)

## 1. Classificação Clara dos Testes Executados
- **Testes unitários (`hasRecoveryAmrClaim`):** Validação direta dos formatos `AMREntry[]` e `string[]`, rejeição de `password`, `oauth`, strings parciais (`"my-recovery-fake"`) e objeto vazio.
- **Testes de integração com mocks offline (`scripts/test-password-recovery-etapa9-1-16.mjs`):**
  - Solicitação: válida, e-mail inválido, anti-enumeração, `redirectTo` seguro, rate limit (`429`), indisponibilidade de rede.
  - Callback real (`GET /auth/callback`): código válido de recuperação, `type=recovery` adulterado sem código, código expirado/reutilizado, exceção inesperada em `exchangeCodeForSession`, open redirect bloqueado e preservação da confirmação de e-mail.
  - Autorização de sessão (`validateRecoverySession` & `updatePasswordWithSupabase`): sessão normal de login (`amr: password`) rejeitada, sessão sem `amr` rejeitada, `amr` sem `recovery` (`oauth`) rejeitada, `sub` divergente rejeitado, `exp` expirado rejeitado, sessão ausente rejeitada, sessão de recuperação válida aceita (incluindo múltiplas leituras simulando refresh), `weak_password`, `same_password`, token expirado (`401`), falha de rede e atualização bem-sucedida.
  - Regressão: `loginWithSupabase` e `registerWithSupabase`.
- **Renderização SSR React (`scripts/test-recovery-ui-etapa9-1-16-2.mjs`):**
  - `ForgotPasswordPage`: renderiza formulário sem card de simulação.
  - `AuthResetPasswordPage`: bloqueia formulário em `?error=recovery_link_invalid` e no estado inicial `checking`.
- **Testes E2E reais:** **Não executados** (ambiente offline sem envio real de e-mails ou interação real no navegador).

## 2. Limitação Documentada para Testes DOM/React Interativos
- Verificado `package.json`: não existem `jsdom`, `@testing-library/react`, `vitest` ou `playwright` instalados no projeto.
- Em respeito às regras da etapa, **nenhuma dependência foi instalada automaticamente**.
- Conforme orientado, `renderToStaticMarkup()` não é considerado teste completo de interação pós-`useEffect`/cliques.
- **Dependências sugeridas para aprovação futura (se desejado):** `@testing-library/react` + `jsdom` (para testar interações completas de DOM, submissão duplicada e efeitos `useEffect` em componentes `"use client"`).
