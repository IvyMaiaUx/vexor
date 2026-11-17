# Etapa 9.1.11 — Testing Strategy

- **Data:** 2026-11-13

## 1. Testes existentes mapeados

Os testes em `scripts/test-*.mjs` são scripts Node.js autônomos sem runner dedicado (`vitest`/`playwright`) no `package.json`:
- `scripts/test-supabase-infra-etapa9-1.mjs`: verifica estaticamente presença de pacotes, `.env.local`, `client.ts`, `server.ts`, `proxy.ts`, `database.types.ts` e migrations (nota: ainda espera `3` migrations, anterior à migration 4 da Etapa 9.1.7).
- `scripts/test-recovery-checks.mjs`: testa regex de e-mail, mensagem anti-enumeração, força de senha e confirmação de senha em funções locais isoladas.
- `scripts/test-admin-layer.mjs`, `scripts/test-forum-checks.mjs`, `scripts/test-contributions-checks.mjs`, etc.: validam regras locais dos stores simulados.
- `supabase/tests/rls_smoke_test.sql`: smoke test SQL para ambiente PostgreSQL local/isolado.

**Lacuna:** Não existem testes automatizados cobrindo fluxos reais com `@supabase/ssr`, troca de cookies em `src/proxy.ts`, `/auth/callback`, carregamento de `public.profiles` após login, bloqueio de conta suspensa ou proteção SSR de `/admin/*`.

## 2. Estratégia de testes recomendada para a implementação futura

1. **Testes unitários (Vitest / Node `assert`):**
   - `getSafeRedirectTarget()` (bloqueio de `//`, `/\`, `http:`, esquemas inválidos).
   - `validateRegistrationInput()` e `validateProfileUpdate()` alinhados às constraints do PostgreSQL (`displayName <= 60`, `username`, URLs HTTPS).
   - Helpers de guarda de rota e mapeamento de erros do Supabase Auth sem vazar enumeração de e-mails.
2. **Testes de integração (contra projeto Supabase de teste / local, nunca poluindo produção sem limpeza):**
   - `signUp` + disparo real de `handle_new_user()` criando linha em `public.profiles` com `role = 'member'`.
   - `signInWithPassword`, refresh de cookie em `src/proxy.ts` (`getUser()`) e `signOut`.
   - Bloqueio de acesso ao `/admin/*` para `anon`, `member` e usuário com `is_suspended = true`.
   - Edição de perfil respeitando as 8 colunas permitidas e rejeitando tentativa de alterar `role` ou `is_suspended`.
3. **Verificações contínuas de build/qualidade:** `npx tsc --noEmit`, `npm run lint` e `npm run build`.
