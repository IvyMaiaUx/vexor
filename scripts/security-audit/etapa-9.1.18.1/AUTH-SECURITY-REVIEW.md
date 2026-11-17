# AUTH & PROFILE SECURITY REVIEW — ETAPA 9.1.18.1

Data: 2026-11-14  
Escopo: Revisão técnica dos controles de segurança em cadastro, login, callback, recuperação de senha, sessão, perfil e proteção de rotas.

> **Princípio de auditoria:** Testes offline com mocks comprovam apenas a lógica do código TypeScript/React sob contratos simulados; **não substituem** nem comprovam por si só a aplicação efetiva de RLS, policies, triggers e configuração de Auth no Supabase remoto.

---

## 1. Identidade Validada pelo Supabase

- **Servidor (`src/lib/supabase/auth.ts`, `src/proxy.ts`, `src/app/api/auth/session/route.ts`):** `resolveServerSession()` e `getAuthenticatedUser()` utilizam `supabase.auth.getUser()`, evitando confiar apenas em `getSession()` ou dados do cliente.
- **Callback PKCE (`src/app/auth/callback/route.ts`):** valida `code`, executa `supabase.auth.exchangeCodeForSession(code)` no servidor e sanitiza `next` com `getSafeRedirectPath()`. Em caso de erro no fluxo `recovery`, redireciona para `/auth/reset-password?error=recovery_link_invalid`.
- **Recuperação (`src/features/auth/recovery-service.ts`):** `validateRecoverySession()` exige `getUser()` + `getClaims()` com `claims.sub === user.id`, `exp` válido no futuro e `amr` contendo `recovery`, bloqueando sessões comuns de senha/OAuth na tela `/auth/reset-password`.
- **Perfil (`src/features/profile/profile-service.ts`):** `readOwnProfile()` valida `supabase.auth.getUser()`, consulta `profiles` filtrando por `userData.user.id` e rejeita inconsistência caso `row.id !== userData.user.id`.

## 2. Separação entre Usuário Autenticado e Não Autenticado

- Visitantes não autenticados acessam `/` (`HTTP 200`), `/login`, `/register`, `/forgot-password`, `/catalog`, `/forum` e `/profile/[username]` (via `public.public_profiles`).
- Rotas protegidas `/admin/*` e `/cybercrime-research/*` são bloqueadas no servidor (`src/proxy.ts` + `src/app/admin/layout.tsx` + `src/app/cybercrime-research/layout.tsx`), redirecionando anônimos para `/login?next=...` (`HTTP 307`).
- `/profile` (`src/app/profile/page.tsx`) não exibe dados privados quando `!user`.

## 3. Restrições de RLS e Proteção de `role` e `is_suspended`

- **No código da aplicação:** `profile-service.ts` define `FORBIDDEN_UPDATE_FIELDS` (`id`, `role`, `is_suspended`, `isSuspended`, `created_at`, `createdAt`, `updated_at`, `updatedAt`) e constrói payload estritamente com campos permitidos.
- **No perfil público:** `readPublicProfileByUsername()` consulta exclusivamente `public.public_profiles` com `PUBLIC_PROFILE_SELECT_COLUMNS`, omitindo `role` e `is_suspended`.
- **Limitação da comprovação atual:** Os testes automatizados desta etapa rodam offline com mocks; a comprovação empírica de que o PostgreSQL/Supabase remoto rejeita `UPDATE` de `role`/`is_suspended` via PostgREST depende de teste remoto dedicado (não executado nesta etapa para respeitar as restrições de não alterar/executar operações remotas desnecessárias).

## 4. Isolamento de Perfis e Sincronização de Sessão

- `use-auth-store.ts` utiliza `syncEpoch`, `bumpSyncEpoch()`, controle single-flight e `performConsistentSignOut()`.
- Correções `PROF-AUD-01` (reinicialização segura do modal de edição ao trocar usuário/abrir) e `PROF-AUD-02` (preservação de `signOutError` durante sincronização normal) estão cobertas por testes unitários/offline em `scripts/test-profile-integration-etapa9-1-17.mjs`.
- **Achado de manutenção nos testes antigos:** Os scripts `scripts/test-register-etapa9-1-13.mjs` e `scripts/test-login-etapa9-1-14.mjs` falharam em verificações regex desatualizadas contra código refatorado nas Etapas 9.1.14 e 9.1.15 (`signInWithIdentifier` e `getAuthenticatedSessionContext`). Isso não indica vulnerabilidade no código de produção atual, mas aponta dívida de manutenção na suíte de testes legada.
