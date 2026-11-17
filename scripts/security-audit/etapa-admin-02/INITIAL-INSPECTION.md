# ETAPA 2 — INSPEÇÃO INICIAL (`INITIAL-INSPECTION.md`)

**Projeto:** VEXOR  
**Data:** 2026-11-15  
**Escopo:** Diagnóstico prévio de `src/app/admin/page.tsx`, layout administrativo, serviços da Etapa 1, i18n e responsividade

## 1. Diagnóstico Encontrado Antes da Implementação

1. **`src/app/admin/page.tsx`:**
   - Consumia o serviço legado `adminService` (`src/features/admin/services/admin-service.ts`) em vez de `adminDataProvider` da Etapa 1.
   - Continha strings fixas em português (`Olá, ...`, `Arquitetura de Segurança & Estado Demonstrativo`, `Ver Histórico Completo`, `Operador`).
   - Não possuía estado de erro nem botão de atualização manual.
   - Não exibia a data atual localizada nem prévias dedicadas para denúncias recentes ou recursos aguardando aprovação.
   - Renderizava `AdminModerationQueue`, que executava mutações diretas via `adminService` legado (inadequado para uma prévia somente leitura da Etapa 2).
2. **Layout e Proteção (`src/app/admin/layout.tsx`, `admin-layout-shell.tsx`, `admin-sidebar.tsx`):**
   - `src/app/admin/layout.tsx` valida `requireServerAuthorization("moderator")` no servidor.
   - `src/app/admin/users/layout.tsx` e `src/app/admin/audit/layout.tsx` exigem `requireServerAuthorization("admin")`.
   - `AdminSidebar` já disponibiliza navegação desktop (`lg+`) e drawer mobile (`< lg`) para `/admin`, `/admin/moderation`, `/admin/catalog`, `/admin/forum`, `/admin/research`, `/admin/reports`, `/admin/users` e `/admin/audit`.
3. **Serviços e Tipos (`src/features/admin/types.ts`, `dashboard-service.ts`):**
   - `AdminDashboardStats` ainda não expunha diretamente `totalPublications` nem `pendingModerationItems` como campos consolidados no serviço de dashboard.
4. **Identidade Visual e Ícones:**
   - Tema escuro (`#070b14`, `#091020`, `#0c1220`, bordas `border-slate-800/90`) com acentos em ciano, azul elétrico (`sky`), violeta, âmbar e rosa.
   - Projeto utiliza SVGs inline (sem biblioteca externa de ícones).
5. **Dicionários (`src/lib/i18n/dictionaries.ts`):**
   - `dict.adminPanel.dashboard` possuía apenas chaves básicas; faltavam chaves bilíngues para os 6 cartões, prévias, estados de carregamento/erro/atualização e atividade recente.
