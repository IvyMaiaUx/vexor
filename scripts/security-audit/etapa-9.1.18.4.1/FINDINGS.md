# FINDINGS — ETAPA 9.1.18.4.1

Data: 2026-11-14  
Classificação utilizada: `CRÍTICO`, `ALTO`, `MÉDIO`, `BAIXO`, `INFORMATIVO`.

---

## Resumo Quantitativo

- **CRÍTICO:** 0
- **ALTO:** 0
- **MÉDIO:** 2
- **BAIXO:** 3
- **INFORMATIVO:** 1

---

## Achados Detalhados

### MÉDIO-01 — Armadilha runtime `from()` no cadastro só cobre `rateLimitRes` e não intercepta `createClient()` direto
- **Arquivo / Linha:** `scripts/test-register-etapa9-1-13.mjs`, linhas 190–226 (Tests 11 e 12).
- **Evidência:** O método armadilha `from()` é passado apenas no `authClient` do caso `rateLimitRes` (que retorna erro `429` antes de qualquer fluxo pós-`signUp`), não nos casos `confirmation_required` (Test 8) ou `authenticated` (Test 9). Além disso, se `registerWithSupabase` chamasse `createClient().from(...)` diretamente em vez de usar `authClient`, o mock `authClient.from()` não capturaria; essa proteção depende da inspeção estática (`stripComments()`).
- **Impacto:** Cobertura runtime parcial da proteção contra `INSERT` manual em `public.profiles` após `signUp()` bem-sucedido.
- **Recomendação:** Em etapa futura, anexar `from()` armadilha também nos mocks dos Tests 8 e 9 (ou em um helper `makeTrapAuthClient`) e, se desejar blindagem total, interceptar `@/lib/supabase/client` via `registerHooks`.

### MÉDIO-02 — Componentes `LoginPage` e `RegisterPage` permanecem sem execução de formulário em runtime
- **Arquivo / Linha:** `scripts/test-login-etapa9-1-14.mjs`, linhas 195–217 (Tests 8 e 10); `scripts/test-register-etapa9-1-13.mjs`, linhas 194–208.
- **Evidência:** As verificações sobre `src/app/login/page.tsx` e `src/app/register/page.tsx` são estáticas/lexicais (`assert.match` / `assert.doesNotMatch`), sem renderizar ou submeter os componentes React em runtime.
- **Impacto:** Alterações na interface de formulário (por exemplo, binding incorreto de evento ou estado visual de `confirmationPending`) não são capturadas por estes scripts offline.
- **Recomendação:** Cobrir os fluxos de UI reais com Playwright na etapa de automação E2E.

### BAIXO-01 — `connection_error` por falha na consulta de `profiles` não testado em `GET /api/auth/session`
- **Arquivo / Linha:** `scripts/test-session-endpoint-etapa9-1-18-4.mjs`, linhas 145–156 (Scenario 4).
- **Evidência:** Scenario 4 testa `throwAuth: true` em `auth.getUser()`, mas não testa `profileError` não nulo retornado por `from("profiles").select(...).eq(...).maybeSingle()`.
- **Impacto:** Baixo; o caminho `profileError` em `resolveServerSessionWithClient` é simples e já retorna `connection_error`, mas não tem caso próprio no teste do endpoint.
- **Recomendação:** Adicionar subcaso com `profileError: { message: "DB timeout" }` retornando HTTP `503`.

### BAIXO-02 — `fetchSessionContext` armadilha ausente nos casos `invalidEmailRes` e `shortPwdRes`
- **Arquivo / Linha:** `scripts/test-login-etapa9-1-14.mjs`, linhas 220–245 (Test 11).
- **Evidência:** Os casos `invalidEmailRes` e `shortPwdRes` verificam `authCalledOnInvalid === false`, mas não passam um `fetchSessionContext` armadilha explícito.
- **Impacto:** Baixo; caso houvesse chamada acidental, `defaultFetchSessionContext` falharia em Node offline com `network_error`, mas um mock explícito torna a intenção do teste mais clara.
- **Recomendação:** Passar `fetchSessionContext` lançando erro nesses dois casos em etapa futura.

### BAIXO-03 — `stripComments()` usa regex simples para remoção de comentários
- **Arquivo / Linha:** `scripts/test-register-etapa9-1-13.mjs`, linhas 190–192.
- **Evidência:** `source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")` pode truncar linhas após `//` dentro de literais de string (ex.: URLs).
- **Impacto:** Baixo no arquivo atual, mas pode causar falso negativo se algum código futuro ficar na mesma linha após uma URL com `//`.
- **Recomendação:** Usar parser AST do `typescript` (já presente em `devDependencies`) caso se mantenha verificação estática.

### INFORMATIVO-01 — Limitação inerente a mocks offline (sem comprovação de Supabase Auth, trigger e RLS remotos)
- **Evidência:** Todos os scripts executados (`9.1.13` a `9.1.18.4`) rodam offline com mocks de `@supabase/supabase-js` / `@/lib/supabase/server`.
- **Impacto:** Não comprovam execução real de `supabase.auth.signUp()`, trigger `handle_new_user()`, policies RLS de `public.profiles` ou cookies reais no navegador.
- **Recomendação:** Tratar na etapa futura de E2E remoto com Playwright e teste negativo remoto de RLS.
