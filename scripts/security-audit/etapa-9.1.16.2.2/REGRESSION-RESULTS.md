# Etapa 9.1.16.2.2 — Resultados dos Testes de Regressão

**Data:** 2026-11-14  
**Escopo:** Verificação pós-correção de `AUD-01A`, `AUD-01B` e identidade *fail-closed* em `src/features/auth/recovery-service.ts`.

---

## 1. Comandos Executados e Códigos de Saída

| # | Comando | Exit Code | Resultado Observado | Natureza do Teste |
| :---: | :--- | :---: | :--- | :--- |
| 1 | `node scripts/test-password-recovery-etapa9-1-16.mjs` | `0` | Passou (`Recovery Request`, `Callback`, `Recovery Session Authorization & Password Update` com suíte `AUD-01A`/`AUD-01B`, `Regression loginWithSupabase & registerWithSupabase` + SSR UI checks) | Unitário / Integração com mocks offline |
| 2 | `node scripts/test-session-auth-etapa9-1-15.mjs` | `0` | Passou (todos os 17 blocos originais + `Runtime Test A`, `Runtime Test B`, `Runtime Test C`) | Unitário / Integração / SSR/React com mocks offline |
| 3 | `node scripts/test-recovery-ui-etapa9-1-16-2.mjs` | `0` | Passou (`ForgotPasswordPage SSR render check passed`, `AuthResetPasswordPage SSR gate check passed`) | Renderização estática SSR (`renderToStaticMarkup`, sem `jsdom`) |
| 4 | `npx tsc --noEmit` | `0` | Passou sem erros de tipagem | Análise estática TypeScript |
| 5 | `npm run lint` | `0` | Passou com `0 errors, 2 warnings` (warnings pré-existentes em `scripts/security-audit/run-all-tests.mjs` linhas 156 e 193) | Análise estática ESLint |

---

## 2. Observações sobre Escopo

- Nenhum teste E2E real contra o projeto Supabase remoto foi executado nesta etapa (em conformidade com a restrição de não executar escrita remota, não criar usuários e não enviar e-mails).
- Nenhum pacote (`jsdom`, Testing Library, etc.) foi instalado.
- `DEMO_PROFILES`, migrations, RLS, `.env.local` e ACLs do Windows permaneceram intocados.
