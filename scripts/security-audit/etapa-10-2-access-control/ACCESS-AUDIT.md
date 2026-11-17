# VEXOR — Etapa 10.2: Auditoria de Acesso para Visitantes Não Autenticados

## 1. Escopo da Auditoria
Auditoria de controle de acesso realizada localmente para restringir visitantes não autenticados exclusivamente à landing page pública (`/`) e às rotas necessárias de autenticação (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/reset-password`, `/auth/callback`, `/api/auth/*`).

## 2. Achados Anteriores à Etapa 10.2
1. **Rotas de conteúdo e perfil acessíveis sem sessão:** `isProtectedAppRoute` / `evaluateProtectedRouteAccess` e `src/proxy.ts` protegiam apenas `/admin/*` e `/cybercrime-research/*`, deixando `/catalog/*`, `/forum/*`, `/my-contributions` e `/profile/*` acessíveis para visitantes.
2. **Landing page (`/`) carregava dados internos:** `src/app/page.tsx` disparava `queryCatalogResources()` e `queryForumTopics()` sem verificar usuário autenticado e exibia barra de busca, categorias, catálogo e tópicos do fórum para visitantes.
3. **Navbar inferior mobile sempre visível:** `src/components/layout/header.tsx` renderizava `<nav aria-label="Mobile Quick Bar">` (Início, Catálogo, Fórum, Contribuir, Perfil/Entrar) para visitantes deslogados, e `src/components/layout/footer.tsx` mantinha `pb-16 sm:pb-0` e links internos (`/catalog`, `/forum`, `/cybercrime-research`, `/catalog/submit`).
4. **Logout em rota protegida:** O clique em sair no `Header` não redirecionava o cliente imediatamente quando o usuário estava em rotas recém-protegidas (`/catalog`, `/forum`, `/my-contributions`, `/profile`).

## 3. Correções Aplicadas
- Proteção server-side estendida em `src/lib/supabase/auth.ts` e `src/proxy.ts`.
- Ocultação condicional completa e bloqueio de fetches na landing page em `src/app/page.tsx`.
- Remoção total da navbar inferior mobile e links internos para visitantes em `src/components/layout/header.tsx` e `src/components/layout/footer.tsx`, incluindo remoção de `pb-16` quando `!user` e limpeza do texto de stack técnica no rodapé.
- Remoção definitiva do Simulador Rápido de Perfis (`DEMO_PROFILES`, `signInWithProfile`, `signInWithIdentifier`, `registerUser` e modo `"demo"`) em `src/app/login/page.tsx`, `src/app/profile/page.tsx`, `src/features/auth/use-auth-store.ts` e isolamento de fixture local em `src/features/admin/services/admin-service.ts`.
- Redirecionamento imediato para `/login` ao realizar logout dentro de rotas protegidas em `Header`.
