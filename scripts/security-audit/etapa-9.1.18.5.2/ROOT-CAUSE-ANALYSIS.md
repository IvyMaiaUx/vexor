# Análise de Causa Raiz — Etapa 9.1.18.5.2

## 1. Cenário Investigado
- **Arquivo:** `e2e/auth/login.spec.ts`
- **Teste:** `exibe erro genérico seguro ao tentar login com credenciais inválidas`
- **Erro original (Etapa 9.1.18.5.1):**
  `locator('div.text-rose-300, p.text-rose-400').first()` não ficou visível dentro do timeout de 15s.

## 2. Evidências Coletadas

1. **Artefato de falha (`test-results/.../error-context.md`):**
   O snapshot da página no instante da falha mostrou:
   - `textbox "E-mail"`: `invalid-e2e-user@example.invalid`
   - `textbox "Senha"`: `WrongPassword#2026`
   - `button "Entrando..." [disabled]`
   Isso comprova que o formulário foi submetido (`isSubmitting = true`), chamou `handleSubmit` (`src/app/login/page.tsx`) e acionou `loginWithSupabase` (`src/features/auth/login-service.ts`).

2. **Inspeção de `src/app/login/page.tsx` e `src/features/auth/login-service.ts`:**
   - `handleSubmit` valida e-mail (`EMAIL_REGEX`) e senha (`password.length < 8`) no client-side, define `setIsSubmitting(true)` e chama `loginWithSupabase`.
   - `loginWithSupabase` chama `authClient.signInWithPassword({ email, password })` (cliente Supabase Auth em `createClient().auth`), que realiza requisição HTTPS externa para `<SUPABASE_URL>/auth/v1/token?grant_type=password`.
   - Quando o Supabase Auth responde com erro (ou `status === 429`), `loginWithSupabase` retorna `{ status: "error", errorCode: "invalid_credentials" }` (sem expor se o e-mail existe), e `LoginPage` renderiza `<div className="... text-rose-300">{errorMessage}</div>` com `dict.auth.errors.invalidCredentials`.

3. **Distinção da causa raiz:**
   - **Não foi erro de renderização ou tratamento na interface:** a UI alternou corretamente para `"Entrando..."` e aguardava a resolução da Promise de `signInWithPassword()`.
   - **Causa principal do timeout:** dependência de resposta de rede externa (`*.supabase.co/auth/v1/token`) em um ambiente de execução sandboxed/offline sem conectividade externa estável dentro dos 15s, impedindo a conclusão da chamada `signInWithPassword()`.
   - **Achado secundário no teste de validação (`login.spec.ts` linha 24/31):** o teste `valida campos vazios e formato inválido sem quebrar a página` utilizava `p.text-rose-400`, classe inexistente em `src/app/login/page.tsx` (que usa `div.text-rose-300`).

## 3. Conclusão
A implementação de produção (`src/app/login/page.tsx` e `src/features/auth/login-service.ts`) está correta e segura. O ajuste necessário era exclusivamente no teste E2E (`e2e/auth/login.spec.ts`) para validar as mensagens semânticas reais da página e isolar a resposta de `**/auth/v1/token*` de forma controlada, sem depender de rede externa ou credenciais reais.
