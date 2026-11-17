# ROUTE ACCESS INVENTORY — VEXOR

Data: 2026-11-14  
Escopo: Inventário de rotas do App Router (`src/app/`) e políticas de acesso no servidor (`src/proxy.ts`, layouts de servidor e `src/lib/supabase/auth.ts`).

---

## 1. Rotas Públicas (acessíveis sem autenticação)

| Rota | Arquivo | Comportamento para visitante não autenticado |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | HTTP `200`. Renderiza a landing page pública do Vexor (Hero, busca/filtros, 12 categorias, recursos em destaque, discussões do fórum, fluxo de contribuição e rodapé), com links de `Sign In` (`/login`) e `Sign Up` (`/register`) no `Header`. |
| `/login` | `src/app/login/page.tsx` | HTTP `200`. Formulário de login e redirecionamento seguro (`next`). |
| `/register` | `src/app/register/page.tsx` | HTTP `200`. Formulário de cadastro de conta. |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | HTTP `200`. Solicitação de e-mail de recuperação de senha. |
| `/reset-password` | `src/app/reset-password/page.tsx` | HTTP `200`. Definição de nova senha mediante sessão/link de recuperação válido. |
| `/auth/reset-password` | `src/app/auth/reset-password/page.tsx` | HTTP `200`. Rota auxiliar do fluxo de recuperação de senha. |
| `/catalog` | `src/app/catalog/page.tsx` | Leitura pública do catálogo de ferramentas e recursos. |
| `/catalog/[slug]` | `src/app/catalog/[slug]/page.tsx` | Leitura pública de item do catálogo. |
| `/forum` | `src/app/forum/page.tsx` | Leitura pública das discussões técnicas do fórum. |
| `/forum/[id]` | `src/app/forum/[id]/page.tsx` | Leitura pública de tópico do fórum. |
| `/profile/[username]` | `src/app/profile/[username]/page.tsx` | Consulta pública exclusivamente via view `public.public_profiles` (sem exposição de `role`, `is_suspended` ou dados privados). |

---

## 2. Rotas Protegidas por Proxy e/ou Layout de Servidor

| Rota / Prefixo | Camada de Proteção | Regra Aplicada | Redirecionamento |
| --- | --- | --- | --- |
| `/admin` e `/admin/*` (`/admin/audit`, `/admin/catalog`, `/admin/forum`, `/admin/moderation`, `/admin/reports`, `/admin/research`, `/admin/users`) | `src/proxy.ts` (`evaluateProtectedRouteAccess`) + `src/app/admin/layout.tsx` (`requireServerAuthorization("moderator")`; `/admin/users` e `/admin/audit` exigem `"admin"` no proxy) | Exige sessão validada via `supabase.auth.getUser()`, perfil existente em `public.profiles`, `is_suspended === false` e papel adequado (`moderator` ou `admin`). | Não autenticado: HTTP `307` para `/login?next=%2Fadmin` (ou subpath seguro). Autenticado sem permissão/suspenso: `/catalog`. |
| `/cybercrime-research` e `/cybercrime-research/*` (`/cases`, `/categories/[slug]`, `/discussions`, `/labs`, `/library`) | `src/proxy.ts` (`evaluateProtectedRouteAccess`) + `src/app/cybercrime-research/layout.tsx` (`requireServerAuthorization("active_member")`) | Exige sessão validada via `supabase.auth.getUser()`, perfil existente e `is_suspended === false`. | Não autenticado: HTTP `307` para `/login?next=%2Fcybercrime-research` (ou subpath seguro). Suspenso/perfil ausente: `/catalog`. |

---

## 3. Rotas de Conta e Interação do Usuário

| Rota | Arquivo | Comportamento |
| --- | --- | --- |
| `/profile` | `src/app/profile/page.tsx` | Exibe painel privado do usuário autenticado ou tela de aviso/login quando não autenticado (`!user`). Operações de leitura e escrita do próprio perfil exigem sessão validada em `supabase.auth.getUser()` e RLS no Supabase. |
| `/my-contributions` | `src/app/my-contributions/page.tsx` | Área pessoal de contribuições do usuário autenticado. |
| `/catalog/bookmarks` | `src/app/catalog/bookmarks/page.tsx` | Favoritos pessoais do usuário autenticado. |
| `/catalog/submit` | `src/app/catalog/submit/page.tsx` | Submissão de novos recursos (operações de escrita sujeitas à autenticação/autorização). |
| `/forum/new` | `src/app/forum/new/page.tsx` | Criação de novo tópico no fórum (sujeita à autenticação/autorização). |
