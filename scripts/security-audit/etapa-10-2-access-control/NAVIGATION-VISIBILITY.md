# VEXOR — Etapa 10.2: Visibilidade de Navegação (Header, Navbar Mobile e Footer)

## 1. Navbar Inferior Mobile (`Mobile Quick Bar`)
- Arquivo: `src/components/layout/header.tsx`.
- O bloco `<nav aria-label="Mobile Quick Bar">` (Início, Catálogo, Fórum, Contribuir, Perfil) agora é renderizado **exclusivamente** quando `{user && (...)}`.
- Para visitantes não autenticados (`user === null`), o elemento não é inserido no DOM (sem `display: none` ou elementos invisíveis interceptando cliques).

## 2. Espaçamento Reservado no Rodapé
- Arquivo: `src/components/layout/footer.tsx`.
- A classe `pb-16 sm:pb-0` foi condicionada a `user ? "pb-16 sm:pb-0" : ""`.
- Visitantes não ficam com espaço vazio de `64px` no rodapé mobile.

## 3. Links Internos no Header, Drawer Mobile e Footer
- **Header Desktop (`lg+`) e Drawer Mobile (`< lg`):**
  - Visitante: exibe identidade VEXOR, link `Início` (`/`), seletor de idioma (`PT-BR` / `EN`) e botões `Entrar` (`/login`) e `Cadastrar` (`/register`).
  - Autenticado: preserva todos os links internos (`/catalog`, `/catalog/bookmarks`, `/#categories`, `/forum`, `/cybercrime-research`, `/catalog/submit`, `/profile`).
- **Footer:**
  - Visitante: exibe apenas `/` (`Início`), `/login`, `/register` e link público do GitHub.
  - Autenticado: preserva todos os links internos de navegação e contribuição.

## 4. Landing Page (`/`) e Login (`/login`)
- Arquivo `src/app/page.tsx`:
  - Mantém a identidade visual, hero e slogan institucional, substituindo CTAs internos por `/login` e `/register` quando `!user`.
  - Oculta barra de busca/filtros do catálogo e as seções de categorias, catálogo e fórum quando `!user`, além de bloquear as chamadas `queryCatalogResources()` e `queryForumTopics()` no `useEffect`.
- Arquivo `src/app/login/page.tsx`:
  - Removido completamente o bloco **Simulador Rápido de Perfis (Modo Pré-Supabase)** e todos os botões de login fictício (`@sec_analyst_br`, `@mod_sentinel`, `@root_admin`, `@suspended_user`). A tela exibe exclusivamente o formulário real via Supabase Auth.
