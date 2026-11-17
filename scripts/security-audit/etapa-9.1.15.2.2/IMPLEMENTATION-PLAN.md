# IMPLEMENTATION-PLAN — Etapa 9.1.15.2.2

## 1. Escopo
Corrigir exclusivamente os dois achados remanescentes da auditoria independente da Etapa 9.1.15.2.1:
1. Preservação de `signOutError` durante execuções automáticas de `syncClientSessionFromServer()` em `src/features/auth/session-sync.ts`.
2. Fortalecimento dos testes em `scripts/test-session-auth-etapa9-1-15.mjs` com testes comportamentais reais para `<SignOutErrorBanner />`, layouts server-side (`/admin/layout.tsx`, `/admin/users/layout.tsx`, `/admin/audit/layout.tsx`, `/cybercrime-research/layout.tsx`) e endpoint `POST /api/auth/logout` (`src/app/api/auth/logout/route.ts`), sem adicionar dependências novas.

## 2. Arquivos Alvo
- `src/features/auth/session-sync.ts`: preservar `prevMeta.signOutError` em todos os ramos de `syncClientSessionFromServer()`.
- `scripts/test-session-auth-etapa9-1-15.mjs`: adicionar testes de preservação de `signOutError` na sincronização automática e integrar a execução dos testes runtime sem regex.
- `scripts/test-runtime-ui-etapa9-1-15-2-2.mjs`: módulo auxiliar isolado com `registerHooks` para executar em runtime `POST /api/auth/logout`, layouts Server Components (`AdminLayout`, `AdminUsersLayout`, `AdminAuditLayout`, `CybercrimeResearchLayout`) e o componente React `<SignOutErrorBanner />`.
- `scripts/security-audit/etapa-9.1.15.2.2/*`: documentação completa da etapa.

## 3. Restrições Respeitadas
- Sem alterações em migrations SQL, banco remoto, RLS, policies, triggers, RPCs, `.env.local`, ACLs do Windows ou `package.json`.
