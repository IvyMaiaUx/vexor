# Auditoria de Experiência e Responsividade — Etapa 8

## 1. Cobertura Estrutural (1440px, 1280px, 768px, 390px, 320px)

- **Tabelas e Cards Adaptativos:** `/admin/users`, `/admin/audit` e `/admin/moderation` utilizam tabelas em desktop (`hidden md:block` / `hidden lg:block` com `overflow-x-auto`) e cards empilhados em tablet/mobile (`md:hidden` / `lg:hidden`).
- **Modais:** Modais de usuários, auditoria, moderação e denúncias utilizam `max-h-[90vh] overflow-y-auto`, `p-4`, `role="dialog"`, `aria-modal="true"` e fechamento via `Escape`.
- **Estados de UI:** Carregamento, erro com botão de retry, fila/tabela vazia, ausência de resultados para filtros, feedback de sucesso e conflito (`409`) presentes nos fluxos administrativos.

## 2. Limitação Declarada

- **Inspeção visual real em navegador não executada nesta etapa:** A verificação de UI foi realizada por análise estrutural de classes Tailwind, acessibilidade básica e renderização React SSR (`renderToStaticMarkup`) em `pt-BR` e `en`, sem abertura de sessão autenticada em navegador real nos viewports `1440px`–`320px`.
