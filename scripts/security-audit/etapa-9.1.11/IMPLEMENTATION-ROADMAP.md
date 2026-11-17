# Etapa 9.1.11 — Implementation Roadmap

- **Data:** 2026-11-13
- **Objetivo:** Plano técnico incremental para substituir a autenticação simulada pela autenticação real via Supabase Auth (`@supabase/ssr`).

## Etapa 1 — Fundação Auth no Servidor e Callbacks
- Criar Route Handler `src/app/auth/callback/route.ts` (troca de `code` PKCE via `exchangeCodeForSession` com validação estrita de `next` via `getSafeRedirectTarget`).
- Criar utilitário compartilhado de segurança de redirecionamento (`src/lib/security/redirect.ts`) e helper server-side de sessão + perfil (`getCurrentSessionAndProfile()` usando `src/lib/supabase/server.ts` + `getUser()` + consulta em `public.profiles`).
- Atualizar `src/proxy.ts` para proteger rotas privadas (`/profile`, `/my-contributions`, `/catalog/submit`, `/catalog/bookmarks`, `/forum/new`, `/cybercrime-research/:path*`, `/admin/:path*`) redirecionando não autenticados para `/login?next=...`.

## Etapa 2 — Substituição do `useAuthStore` por Sessão Real
- Criar `AuthProvider` / refatorar `src/features/auth/use-auth-store.ts` para hidratar estado a partir do servidor e assinar `supabase.auth.onAuthStateChange()`.
- Carregar perfil real de `public.profiles` (para o usuário logado) e usar `public.public_profiles` para consultas públicas de terceiros (`/profile/[username]`).
- Remover armazenamento de sessão/usuários em `localStorage` e remover `DEMO_PROFILES` do fluxo de autenticação.
- Corrigir `displayName` max `60` em `src/features/auth/validation.ts`.

## Etapa 3 — Integração das Telas de Autenticação
- `src/app/register/page.tsx`: integrar `supabase.auth.signUp()` enviando `username`, `display_name` e `preferred_locale` em `options.data`, e exibir estado de confirmação de e-mail.
- `src/app/login/page.tsx`: integrar `supabase.auth.signInWithPassword()`, tratar contas suspensas (`is_suspended`), remover botões de login demo e aplicar `router.refresh()`.
- `src/app/forgot-password/page.tsx`: integrar `supabase.auth.resetPasswordForEmail()` com `redirectTo` para `/auth/callback?next=/reset-password` e remover link de simulação.
- `src/app/reset-password/page.tsx`: integrar `supabase.auth.updateUser({ password })` validando sessão de recuperação ativa.
- `src/components/layout/header.tsx` e botões de logout: usar `supabase.auth.signOut()` + `router.refresh()` + redirecionamento se em rota privada.

## Etapa 4 — Hardening Server-Side de Rotas Admin/Privadas e Perfil
- Adicionar verificação server-side em `/admin/layout.tsx` (ou Server Wrapper) para validar `getUser()` + `role` + `!is_suspended` antes de renderizar o painel administrativo.
- Atualizar `src/features/profile/profile-edit-modal.tsx` para persistir as 8 colunas permitidas diretamente em `public.profiles`.
- Remover importação de `DEMO_PROFILES` em `src/features/admin/services/admin-service.ts` (preparando para integração real do admin).

## Etapa 5 — Testes e Validação Final
- Atualizar `scripts/test-supabase-infra-etapa9-1.mjs` (4 migrations), adicionar testes de validação/redirect e validar `tsc`, `lint` e `build`.
