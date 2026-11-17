# FINDINGS — Etapa 9.1.16.1

## 1. Achados Identificados

### `REC-01` — Validação da sessão de recuperação não distingue sessão comum de sessão de recuperação
- **Identificador:** `REC-01`
- **Severidade:** Média
- **Arquivo e localização:**
  - `src/features/auth/recovery-service.ts` (`validateRecoverySession()`, linhas 144-166; `updatePasswordWithSupabase()`, linhas 175-196)
  - `src/app/auth/reset-password/page.tsx` (`useEffect`, linhas 59-91)
- **Descrição técnica:** `validateRecoverySession()` consulta apenas `supabase.auth.getUser()` e retorna `"valid"` sempre que `data.user` não é nulo. Não verifica o método de autenticação (`amr` claim `"recovery"` no JWT/`getClaims()`) nem exige confirmação de evento `PASSWORD_RECOVERY` ou reautenticação.
- **Cenário de exploração ou falha:** Um usuário já autenticado por login comum (ou alguém com acesso físico a um navegador onde já existe sessão comum ativa) pode navegar diretamente para `/auth/reset-password` e redefinir a senha sem ter passado pelo link de recuperação por e-mail.
- **Impacto:** Sessões comuns antigas são tratadas como equivalentes a sessões recém-criadas de recuperação de senha na página `/auth/reset-password`.
- **Evidência encontrada:** `validateRecoverySession()` retorna `"valid"` para `data.user` sem inspecionar claims `amr` (`recovery`), e `onAuthStateChange` em `src/app/auth/reset-password/page.tsx` trata `SIGNED_IN` de forma idêntica a `PASSWORD_RECOVERY`.
- **Recomendação de correção:** Validar no servidor/claims (`getClaims()` ou inspeção do claim `amr` do JWT no Supabase SSR) que a sessão possui contexto `recovery` (ou exigir reautenticação / contexto explícito `PASSWORD_RECOVERY` emitido no callback), rejeitando sessões comuns antigas na rota `/auth/reset-password`.

---

### `REC-05` — Lacunas de cobertura comportamental nos testes da Etapa 9.1.16
- **Identificador:** `REC-05`
- **Severidade:** Média
- **Arquivo e localização:** `scripts/test-password-recovery-etapa9-1-16.mjs` (linhas 1-356)
- **Descrição técnica:** Todos os testes da Etapa 9.1.16 são de integração com mocks offline para os serviços e callback. Não há execução dos componentes React `ForgotPasswordPage` e `AuthResetPasswordPage`, não há teste diferenciando sessão comum vs sessão de recuperação, e faltam casos para `same_password`, `weak_password` e exceção lançada no `exchangeCodeForSession`.
- **Cenário de exploração ou falha:** Regressões de UI (ex.: perda de `disabled={isSubmitting}`, falha no toggle mostrar/ocultar senha, ou exibição acidental do formulário quando `sessionStatus === "invalid"`) não seriam detectadas pela suíte atual.
- **Impacto:** Cobertura parcial sobre o comportamento real de interface e sobre alguns ramos de erro do `recovery-service.ts`.
- **Evidência encontrada:** Inspeção de `scripts/test-password-recovery-etapa9-1-16.mjs` mostra apenas chamadas diretas a `requestPasswordRecovery`, `authCallbackGet`, `validateRecoverySession`, `updatePasswordWithSupabase`, `loginWithSupabase` e `registerWithSupabase`.
- **Recomendação de correção:** Adicionar testes runtime dos componentes React (`ForgotPasswordPage` e `AuthResetPasswordPage`), além de casos para `same_password`, `weak_password`, exceção no callback e rejeição de sessão comum (após correção de `REC-01`).

---

### `REC-03` — Parâmetro `type=recovery` no callback manipulável para redirecionamento interno
- **Identificador:** `REC-03`
- **Severidade:** Baixa
- **Arquivo e localização:** `src/app/auth/callback/route.ts` (linhas 10-41)
- **Descrição técnica:** O callback diferencia recuperação de confirmação de e-mail exclusivamente pelo query param `type=recovery` presente na URL.
- **Cenário de exploração ou falha:** Se um usuário obtiver um `code` válido de confirmação de e-mail e alterar manualmente `&type=recovery` antes da requisição ao `/auth/callback`, será redirecionado para `/auth/reset-password` com a sessão recém-estabelecida.
- **Impacto:** Baixo isoladamente (não cria open redirect, pois restringe o destino a `/auth/reset-password`), mas permite encaminhamento à tela de redefinição caso `REC-01` permaneça aberto.
- **Evidência encontrada:** `const isRecoveryFlow = flowType === "recovery";` em `src/app/auth/callback/route.ts:14`.
- **Recomendação de correção:** Combinado à correção de `REC-01`, validar o contexto real da sessão (`amr === "recovery"`) na página/servidor de `/auth/reset-password`, independentemente do query param `type`.

---

### `REC-02` — Possível diferenciação de rate limit (`429`) por e-mail no provedor
- **Identificador:** `REC-02`
- **Severidade:** Baixa
- **Arquivo e localização:** `src/features/auth/recovery-service.ts` (linhas 118-133) e `src/app/forgot-password/page.tsx` (linhas 51-60)
- **Descrição técnica:** Embora erros de lookup (`user_not_found`) sejam normalizados para `{ status: "dispatched" }`, erros `429` (`rate_limited`) são repassados ao usuário.
- **Cenário de exploração ou falha:** Dependendo de como o GoTrue contabiliza o rate limit de envio de e-mails (`over_email_send_rate_limit`), disparos repetidos contra um mesmo endereço podem produzir `429` em momento distinto conforme o estado interno do provedor.
- **Impacto:** Baixo; comportamento padrão de proteção anti-spam do provedor Auth.
- **Evidência encontrada:** `if (error.status === 429 || code.includes("rate_limit")) return { status: "error", errorCode: "rate_limited" };`.
- **Recomendação de correção:** Manter o tratamento atual (necessário para UX legítima) e garantir no painel Supabase limites de taxa consistentes e proteção por IP.

---

### `REC-04` — Permanência da sessão atual após troca de senha e janela de Access Tokens em outros dispositivos
- **Identificador:** `REC-04`
- **Severidade:** Informativa
- **Arquivo e localização:** `src/app/auth/reset-password/page.tsx` (linhas 167-170)
- **Descrição técnica:** Após `updateUser({ password })`, a aplicação chama `await refreshSession()`, mantendo a sessão atual ativa. Conforme documentação oficial do Supabase Auth, `updateUser({ password })` revoga os *refresh tokens* das demais sessões, mas *Access Tokens* (JWTs) já emitidos em outros dispositivos continuam válidos até expirar naturalmente.
- **Cenário de exploração ou falha:** Janela residual entre a troca da senha e a expiração natural do JWT em outro dispositivo já autenticado; além disso, se a política exigir novo login após recuperação, a sessão atual permanece ativa.
- **Impacto:** Informativo / decisão de política de sessão.
- **Evidência encontrada:** `await refreshSession(); setIsSuccess(true);` em `src/app/auth/reset-password/page.tsx:168-169` e documentação oficial do Supabase Auth (`updateUser`).
- **Recomendação de correção:** Avaliar se após a troca de senha por recuperação a aplicação deve encerrar a sessão atual (`signOut()`) para exigir login explícito com a nova senha, ou mantê-la ativa como está.

---

### `REC-06` — Restrição PKCE entre navegadores/dispositivos
- **Identificador:** `REC-06`
- **Severidade:** Informativa
- **Arquivo e localização:** `scripts/security-audit/etapa-9.1.16/SUPABASE-CONFIGURATION.md`
- **Descrição técnica:** O fluxo PKCE SSR do Supabase armazena o `code_verifier` no navegador onde `resetPasswordForEmail()` foi chamado.
- **Cenário de exploração ou falha:** Usuário solicita recuperação no desktop e abre o link do e-mail no celular; `exchangeCodeForSession(code)` falha por ausência do `code_verifier`.
- **Impacto:** UX em cenários multi-dispositivo (limitação inerente ao PKCE).
- **Evidência encontrada:** Documentação oficial Supabase Auth para PKCE/SSR.
- **Recomendação de correção:** Documentar aviso claro ao usuário na tela de solicitação para abrir o link no mesmo navegador em que solicitou a recuperação.
