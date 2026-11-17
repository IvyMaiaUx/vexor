# TEST QUALITY REVIEW — ETAPA 9.1.18.3

Data: 2026-11-14  
Escopo: Análise da qualidade das asserções, cobertura, mocks, falsos positivos potenciais e limitações estruturais nos scripts `scripts/test-register-etapa9-1-13.mjs` e `scripts/test-login-etapa9-1-14.mjs`.

---

## 1. Achados Classificados por Severidade

### MÉDIO-01 — Mistura de responsabilidade e verificação puramente lexical no Test 12 (`test-register-etapa9-1-13.mjs`)
- **Arquivo/Trecho:** `scripts/test-register-etapa9-1-13.mjs`, linhas 199–207.
- **Evidência:** O script de cadastro lê `src/app/login/page.tsx` e usa `assert.match` para procurar os identificadores `loginWithSupabase`, `DEMO_PROFILES` e `signInWithProfile`.
- **Impacto:** Uma asserção por regex de identificador passaria mesmo se `loginWithSupabase` estivesse apenas importado ou morto no arquivo, não validando a execução real do formulário de login nem separando adequadamente a responsabilidade da suíte de cadastro.

### MÉDIO-02 — Verificação estática por regex em vez de execução de handler no Test 10 (`test-login-etapa9-1-14.mjs`)
- **Arquivo/Trecho:** `scripts/test-login-etapa9-1-14.mjs`, linhas 208–215.
- **Evidência:** O Test 10 verifica `/resolveServerSession/`, `/evaluateSessionAuthorization/`, `/resolution\.profile/` e `/Cache-Control.*no-store/` via `fs.readFileSync` em `src/app/api/auth/session/route.ts`, sem invocar `GET()`.
- **Impacto:** Se uma alteração futura mantivesse `Cache-Control: no-store` em apenas um dos retornos da rota (por exemplo, `200` autenticado) e o removesse no `200` `profile_missing` ou `503`, a regex continuaria passando (falso positivo parcial).

### MÉDIO-03 — Cenários de erro e borda não cobertos em `login-service.ts` (`test-login-etapa9-1-14.mjs`)
- **Arquivo/Trecho:** `scripts/test-login-etapa9-1-14.mjs` vs. `src/features/auth/login-service.ts` (linhas 116–154).
- **Evidência:** `test-login-etapa9-1-14.mjs` não exercita `invalid_email`, `password_too_short`, `rate_limited` (HTTP 429) nem o caso em que `fetchSessionContext()` retorna `authenticated: false` após `signInWithPassword` bem-sucedido.
- **Impacto:** Regressões nesses mapeamentos de erro não seriam detectadas pelo script `9.1.14`.

### BAIXO-01 — Ausência de asserção explícita contra `insert` de perfil em `register-service.ts`
- **Arquivo/Trecho:** `scripts/test-register-etapa9-1-13.mjs`, linhas 189–197.
- **Evidência:** O Test 11 verifica ausência de `service_role`, `localStorage` e `registerUser(`, mas não verifica ausência de `.from(` ou `.insert(` em `register-service.ts` (ao contrário do Test 10 de login).
- **Impacto:** Baixo, pois `registerWithSupabase` recebe apenas `authClient` com `signUp()` e não cria cliente de tabela.

### BAIXO-02 — Cenários de erro não exercitados em `register-service.ts` (`test-register-etapa9-1-13.mjs`)
- **Arquivo/Trecho:** `scripts/test-register-etapa9-1-13.mjs` vs. `src/features/auth/register-service.ts` (linhas 107–118).
- **Evidência:** Os retornos `rate_limited`, `weak_password` e `signup_failed` de `registerWithSupabase` não têm casos de teste dedicados em `9.1.13`.
- **Impacto:** Baixo, mas reduz a cobertura dos caminhos de erro do serviço.

### INFORMATIVO-01 — Mapeamento de caminho de módulo (`src/lib/supabase/auth.ts`)
- **Evidência:** O módulo real de resolução de sessão e autorização no servidor é `src/lib/supabase/auth.ts` (não `src/lib/security/auth.ts`).

### INFORMATIVO-02 — Limitação inerente a testes offline com mocks
- **Evidência:** Todos os scripts (`9.1.13` a `9.1.17`) utilizam mocks offline e renderização SSR isolada. Eles **não comprovam** execução real contra Supabase Auth remoto, trigger `handle_new_user()`, policies RLS de `public.profiles` nem comportamento em navegador real.
