# Etapa 9.1.17.1 — Resultados de Testes da Auditoria Independente

**Regime:** Exclusivamente READ-ONLY. `next build` não executado devido à restrição ambiental de ACL no diretório `.next`.

---

## 1. Comandos Executados e Códigos de Saída

| # | Comando | Exit Code | Tipo Real de Teste | Resultado |
| :---: | :--- | :---: | :--- | :--- |
| 1 | `node scripts/test-profile-integration-etapa9-1-17.mjs` | `0` | Unitário / Integração com **mocks offline** | Passou (`Profile read tests passed`, `Profile update & security tests passed`). |
| 2 | `node scripts/test-password-recovery-etapa9-1-16.mjs` | `0` | Unitário / Integração com **mocks offline** + **SSR estático** | Passou. |
| 3 | `node scripts/test-session-auth-etapa9-1-15.mjs` | `0` | Unitário / Integração / SSR-React com **mocks offline** | Passou. |
| 4 | `npx tsc --noEmit` | `0` | **Análise estática** TypeScript | Passou sem erros. |
| 5 | `npm run lint` | `0` | **Análise estática** ESLint | Passou (`0 errors, 2 warnings` pré-existentes em `scripts/security-audit/run-all-tests.mjs`). |

---

## 2. Distinção de Evidências

- **Comprovado por testes offline:** Lógica de `readOwnProfile()`, `readPublicProfileByUsername()`, `updateOwnProfile()`, rejeição de `forbidden_field`, allowlist das 8 colunas, bloqueio de `expectedUserId` divergente e tratamento de erros.
- **Comprovado por análise estática/schema:** Compatibilidade entre `profile-service.ts` e as migrations SQL (`GRANT UPDATE`, `profiles_update_own`, `public_profiles`).
- **NÃO comprovado por execução real:** Execução E2E contra instância remota do Supabase (RLS real no PostgreSQL, `handle_new_user()`, fluxo completo no navegador).
