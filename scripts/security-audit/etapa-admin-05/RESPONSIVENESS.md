# RESPONSIVENESS — ETAPA 5

## 1. Estrutura Responsiva e Acessibilidade

- **1440px / 1280px (`lg` / `md+`):** grade de 5 indicadores (`lg:grid-cols-5`), barra de filtros em 6 colunas (`lg:grid-cols-6`), tabela desktop (`hidden overflow-x-auto md:block`).
- **768px / 390px / 320px (`< md`):** cards mobile (`md:hidden`) com botão `min-h-[38px]` em largura total, barra de filtros empilhada (`grid-cols-1 sm:grid-cols-2`), modal rolável (`max-h-[90vh] overflow-y-auto p-4`), fechamento por `Escape`, `role="dialog"`, `aria-modal="true"` e foco visível (`focus-visible:ring-2`).

## 2. Limitação de Inspeção Visual

Não foi executada inspeção visual em navegador real autenticado nesta etapa, pois `/admin/audit` exige sessão `admin` validada no servidor (`requireServerAuthorization("admin")`) e as restrições proíbem alterar ou utilizar a conta administrativa real. A validação de UI foi realizada via renderização SSR (`renderToStaticMarkup`) em `pt-BR` e `en`.
