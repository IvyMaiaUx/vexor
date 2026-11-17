# RESPONSIVENESS — ETAPA 4

## 1. Adaptação por Breakpoint (Análise de Código + SSR)

- **1440px / 1280px (`lg` / `md+`):** Tabela desktop (`hidden md:block`) com coluna de ações alinhada à direita exibindo `Detalhes`, `Alterar papel` e `Suspender` / `Reativar` em layout flexível (`flex-wrap`).
- **768px / 390px / 320px (`< md`):** Cards mobile (`md:hidden`) com grade responsiva de botões (`grid-cols-1 sm:grid-cols-3`) e altura mínima `min-h-[38px]` para toque confortável sem transbordamento horizontal.
- **Modais (`AdminUserDetailModal`, `AdminUserRoleModal`, `AdminUserSuspensionModal`):** Contêiner com `overflow-y-auto p-4`, card `max-w-lg` / `max-w-2xl`, `role="dialog"`, `aria-modal="true"`, fechamento por `Escape`, rótulos explícitos e foco visível (`focus-visible:ring-2`).

## 2. Limitação de Inspeção Visual

Não foi executada inspeção visual em navegador real autenticado nesta etapa, pois `/admin/users` exige sessão `admin` validada no servidor (`requireServerAuthorization("admin")`) e as restrições proíbem alterar ou utilizar a conta administrativa real para contornar a proteção. A validação de renderização foi realizada via SSR (`renderToStaticMarkup`) em `pt-BR` e `en`.
