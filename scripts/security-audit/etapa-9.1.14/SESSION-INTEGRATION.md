# ETAPA 9.1.14 — Session Integration

- **Data:** 2026-11-13

## 1. Mecanismo Oficial Supabase SSR

- Os cookies de sessão (`sb-*`) são gerenciados exclusivamente pelo `@supabase/ssr` (`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts` e `src/proxy.ts`).
- `src/proxy.ts` executa `updateSession()` a cada requisição, renovando tokens e validando a sessão via `supabase.auth.getUser()`.
- `GET /api/auth/session` (`src/app/api/auth/session/route.ts`) expõe a leitura server-side de `getAuthenticatedSessionContext()` (`src/lib/supabase/auth.ts`) com `Cache-Control: no-store`.

## 2. Perfil, Role e Suspensão

- `role` e `is_suspended` são obtidos exclusivamente de `public.profiles` no servidor após confirmação da identidade via `getUser()`.
- O login **não** cria nem atualiza linhas em `public.profiles` manualmente; caso o perfil não exista, retorna `profile_missing`.
- `useAuthStore.setAuthenticatedSession(profile)` sincroniza os componentes cliente (`Header`, `AdminGuard`, `ResearchAccessGuard`) apenas para UX, sem atuar como autoridade de autorização (que permanece no servidor e nas políticas RLS do PostgreSQL).
- `useAuthStore.signOut()` limpa o estado local de UI e invoca `createClient().auth.signOut()` para encerrar a sessão SSR.
