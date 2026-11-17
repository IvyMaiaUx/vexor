# Etapa 9.1.17.1.1 — Resultados dos Testes

**Data:** 2026-11-14  
**Escopo:** Correções `PROF-AUD-01` (`ProfileEditModal`) e `PROF-AUD-02` (`signOutError` em `applyAuthenticatedSessionToStorage` / `useAuthStore`).

---

## 1. Comandos Executados e Códigos de Saída

| # | Comando | Exit Code | Resultado Observado | Natureza |
| :---: | :--- | :---: | :--- | :--- |
| 1 | `node scripts/test-profile-integration-etapa9-1-17.mjs` | `0` | Passou (`Profile read tests passed`, `Profile update & security tests passed`, `PROF-AUD-01 modal lifecycle & user-switch tests passed`, `PROF-AUD-02 signOutError preservation & single-flight tests passed`) | Mocks offline + SSR React (`renderToStaticMarkup`) |
| 2 | `node scripts/test-password-recovery-etapa9-1-16.mjs` | `0` | Passou | Mocks offline + SSR estático |
| 3 | `node scripts/test-session-auth-etapa9-1-15.mjs` | `0` | Passou | Mocks offline + SSR/React |
| 4 | `npx tsc --noEmit` | `0` | Passou sem erros | Análise estática TypeScript |
| 5 | `npm run lint` | `0` | Passou com `0 errors, 2 warnings` (warnings pré-existentes em `scripts/security-audit/run-all-tests.mjs` linhas 156 e 193) | Análise estática ESLint |
| 6 | `next build` | *(não executado)* | Não executado devido à restrição pré-existente de ACL no diretório `.next` | — |
