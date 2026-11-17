# ETAPA 1.1 — REVISÃO DE SEGURANÇA (`SECURITY-REVIEW.md`)

**Projeto:** VEXOR  
**Escopo:** Prevenção de Open Redirect em autenticação, callback e rotas protegidas

## 1. Conclusão de Segurança

- Não havia vulnerabilidade de Open Redirect para domínios externos via `https://`, `//`, `\` ou caracteres de controle crus no fluxo de login, cadastro, recuperação ou callback, pois todos já utilizavam `getSafeRedirectPath()`.
- Com o endurecimento iterativo em `src/lib/security/redirect.ts`, vetores codificados (`%5c`, `%2f`, `%0d%0a`, dupla codificação), sequências malformadas e variantes de loop `/auth/callback/` também passam a ser normalizados e bloqueados na origem da validação.

## 2. Separação entre Redirecionamento e Autorização

- `getSafeRedirectPath()` garante exclusivamente que o destino de navegação pós-autenticação permaneça interno à aplicação.
- A autorização de acesso a `/admin`, `/admin/users`, `/admin/audit` e `/cybercrime-research` continua sendo validada no servidor via `resolveServerSessionWithClient()` + `evaluateProtectedRouteAccess()` (`src/proxy.ts` e `src/lib/supabase/auth.ts`), além das políticas RLS e RPCs no banco PostgreSQL.

## 3. Limitações Documentadas

- Os testes de `src/app/auth/callback/route.ts`, `loginWithSupabase`, `registerWithSupabase` e `requestPasswordRecovery` em `scripts/test-open-redirect-etapa-admin-01-1.mjs` executam com mocks isolados de `next/server` e do cliente Supabase (sem chamadas remotas, sem envio de e-mails e sem alterações em contas ou banco remoto).
