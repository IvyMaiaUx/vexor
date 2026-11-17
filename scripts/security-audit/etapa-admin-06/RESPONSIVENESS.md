# Responsividade Estrutural — Etapa 6

- **Desktop (`1440px`, `1280px`):**
  - Tabela completa em `hidden lg:block overflow-x-auto` com colunas de tipo, título/motivo, autor, prioridade, denúncias, atualização, situação e ações rápidas.
  - Grid de filtros em `lg:grid-cols-4` e KPIs em `sm:grid-cols-4`.
- **Tablet (`768px`) e Mobile (`390px`, `320px`):**
  - Cards empilhados em `grid-cols-1 gap-3 lg:hidden` sem overflow horizontal.
  - Modais responsivos com `max-h-[90vh] overflow-y-auto` e `p-4`.
- **Limitação:** Validação estrutural por classes Tailwind e SSR; inspeção visual em navegador real autenticado não foi executada por restrições da etapa.
