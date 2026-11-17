# Etapa 9.1.11 — Auth Security Findings

- **Data:** 2026-11-13
- **Classificação adotada:** CRÍTICO, ALTO, MÉDIO, BAIXO, INFORMATIVO.

## Achados classificados

### [CRÍTICO] 01 — Autenticação e sessão simuladas em `localStorage` (`DEMO_PROFILES`)
- **Onde:** `src/features/auth/use-auth-store.ts`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/features/admin/services/admin-service.ts`.
- **Descrição:** A sessão (`cybersec_auth_session`) e os usuários (`cybersec_registered_users`) ficam em `localStorage`, aceitando login por botões demo com privilégios `admin`/`moderator` ou qualquer senha `>= 8` caracteres sem verificação criptográfica.
- **Impacto:** Bypass trivial de autenticação e elevação arbitrária de `role` no frontend enquanto o mock estiver ativo.
- **Recomendação:** Substituir integralmente por Supabase Auth (`@supabase/ssr` + cookies `HttpOnly`/gerenciados pelo SSR) e remover `DEMO_PROFILES` e botões de login demo do fluxo de produção.

### [ALTO] 02 — Proteção de rotas privadas e `/admin/*` restrita ao Client Component
- **Onde:** `src/proxy.ts`, `src/app/admin/layout.tsx`, `src/features/admin/components/admin-guard.tsx`, `src/app/profile/page.tsx`, `src/app/catalog/bookmarks/page.tsx`, `src/app/catalog/submit/page.tsx`, `src/app/forum/new/page.tsx`, `src/app/my-contributions/page.tsx`.
- **Descrição:** Nenhuma rota privada verifica `supabase.auth.getUser()` no servidor ou redireciona no `src/proxy.ts`.
- **Impacto:** Páginas restritas são entregues ao cliente sem verificação de sessão no servidor.
- **Recomendação:** Implementar verificação de sessão no `src/proxy.ts` para rotas privadas e revalidação de sessão + `profiles` (`role`, `is_suspended`) no servidor (Server Components / Server Actions / Route Handlers).

### [ALTO] 03 — Fluxo de recuperação/redefinição de senha simulado e com link direto no cliente
- **Onde:** `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`.
- **Descrição:** `forgot-password` usa `setTimeout` e exibe um link direto `/reset-password?email=...` sem token; `reset-password` simula sucesso sem sessão de recuperação real.
- **Recomendação:** Integrar `resetPasswordForEmail()`, Route Handler `/auth/callback` (ou `/auth/confirm`) e `updateUser({ password })`, removendo o link simulado.

### [MÉDIO] 04 — Divergência de validação de `displayName` (80 vs 60 caracteres)
- **Onde:** `src/features/auth/validation.ts` (linha 79).
- **Descrição:** `validateRegistrationInput` aceita até `80` caracteres, mas a constraint `profiles_display_name_len` no PostgreSQL limita a `60`.
- **Recomendação:** Alinhar o limite para `60` caracteres em `validateRegistrationInput`.

### [BAIXO] 05 — `getSafeRedirectTarget()` pode ser endurecido contra backslashes
- **Onde:** `src/app/login/page.tsx`, `src/app/register/page.tsx`.
- **Descrição:** `next.startsWith("/") && !next.startsWith("//")` bloqueia `//evil.com`, mas recomenda-se bloquear também `/\` (`!next.startsWith("/\\")`) e caracteres de controle para prevenir open redirect em navegadores tolerantes.

### [INFORMATIVO] 06 — Infraestrutura `@supabase/ssr` já compatível e sem exposição de `service_role`
- **Onde:** `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/proxy.ts`, `.env.local`.
- **Descrição:** Os clientes browser/server e `updateSession` seguem as boas práticas do `@supabase/ssr` para Next.js 16 sem uso de `service_role` no frontend.
