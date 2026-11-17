# AUTOMATION STRATEGY — ETAPA 9.1.18.1

Data: 2026-11-14  
Objetivo: Avaliar a infraestrutura atual de testes E2E e propor estratégia segura de automação com a conta de teste dedicada (`maia.operacional@gmail.com`), sem armazenar segredos no repositório.

---

## 1. Infraestrutura Atual Identificada

Inspeção de `package.json`:
- Dependências instaladas: `next`, `react`, `react-dom`, `@supabase/ssr`, `@supabase/supabase-js`, `eslint`, `typescript`, `supabase` (CLI).
- **Ferramentas E2E instaladas:** **Nenhuma** (não há `@playwright/test`, `playwright`, `cypress`, `puppeteer`, `vitest` ou `jest` instalados).
- Os scripts existentes em `scripts/test-*.mjs` usam `node:assert` + mocks offline + SSR de componentes React.

---

## 2. Ferramenta Recomendada

**Recomendação:** `@playwright/test` (não instalado nesta etapa, conforme restrição).
- Suporte nativo a múltiplas abas/contextos isolados (essencial para testar sessão autenticada vs. anônima e troca de usuários).
- Interceptação e inspeção de rede/cookies SSR (`HttpOnly` / cookies `@supabase/ssr`).
- Execução determinística em Chromium headless local e em CI.

---

## 3. Gestão Segura de Credenciais (Sem Segredos no Repositório)

- **Nunca** versionar senhas, tokens, links mágicos ou `.env*` com credenciais reais.
- Usar arquivo local ignorado pelo Git (`.env.e2e.local`, listado em `.gitignore`) ou variáveis de ambiente / GitHub Actions Secrets:
  - `E2E_BASE_URL=http://localhost:3000`
  - `E2E_TEST_USER_EMAIL=maia.operacional@gmail.com`
  - `E2E_TEST_USER_PASSWORD=<fornecida apenas em runtime local/CI>`
  - `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (opcional, para cenários de papel `admin`)

---

## 4. Proposta de Organização dos Testes E2E (Etapa Futura)

1. `e2e/public-and-guards.spec.ts`:
   - Acesso anônimo a `/`, `/login`, `/register`, `/catalog`, `/forum`.
   - Bloqueio anônimo em `/admin` e `/cybercrime-research` (`307` -> `/login?next=...`).
2. `e2e/auth-session.spec.ts`:
   - Login com credenciais inválidas (mensagem segura, sem fallback demo).
   - Login com `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD` e persistência após `page.reload()`.
   - Logout via UI (`POST /api/auth/logout`), limpeza de sessão e bloqueio imediato de `/profile` privado.
3. `e2e/profile-security.spec.ts`:
   - Edição de perfil (`displayName`, `bio`, `preferredLocale`), reload e confirmação de persistência.
   - Verificação de que `/profile/[username]` não expõe `role` ou `is_suspended`.
   - Teste negativo remoto: tentativa direta de `UPDATE` em `role` / `is_suspended` via cliente Supabase autenticado com a conta de teste (`member`), comprovando rejeição real pelo PostgreSQL/RLS.
4. `e2e/recovery-guards.spec.ts`:
   - Acesso a `/auth/reset-password?error=recovery_link_invalid` exibindo bloqueio.
   - Acesso a `/auth/reset-password` com sessão padrão (não-recovery) sendo bloqueado pela validação `amr: recovery`.
   - Fluxo completo de reset de senha apenas em ambiente com caixa de entrada automatizável (ex.: Mailpit/Inbucket local ou API de teste) para evitar rate limit e não alterar a senha fixa da conta dedicada em runs comuns.
