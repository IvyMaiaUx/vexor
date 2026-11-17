# ETAPA 1.1 — CORREÇÕES APLICADAS (`FIXES-APPLIED.md`)

**Projeto:** VEXOR  
**Escopo:** Correções pontuais baseadas em evidências da auditoria

## 1. Endurecimento Pontual em `src/lib/security/redirect.ts`

Embora a proteção principal contra Open Redirect já estivesse ativa via `getSafeRedirectPath()`, a auditoria identificou casos de borda que poderiam escapar de uma checagem simples antes da decodificação do pathname:
- Loop com barra final ou subcaminho em `/auth/callback/` e variantes de caixa (`/AUTH/callback`, `/%61uth/callback`).
- Pathnames com barras invertidas, barras duplas ou caracteres de controle em forma codificada ou duplamente codificada (`/%5cevil.example`, `/%2f/evil.example`, `/%252f%252fevil.example`, `/%255cevil.example`, `/%0d%0a...`).
- Sequências percentuais malformadas (`/%E0%A4%A`).

**Alteração aplicada:**
- Decodificação iterativa limitada (até 3 passadas) sobre `parsed.pathname` em `getSafeRedirectPath()`, rejeitando (com retorno para `defaultPath`) qualquer ocorrência de `//` inicial, `\`, caracteres de controle ASCII (`\x00-\x1f`, `\x7f`), `/auth/callback` (exato ou prefixo `/auth/callback/`, case-insensitive) e erros de `decodeURIComponent`.

## 2. Atualização do Teste Legado em `scripts/test-audit-etapa8.mjs`

- Substituída a asserção estática obsoleta (`next.startsWith("/") && !next.startsWith("//")` em `login/page.tsx` e `register/page.tsx`) pela verificação real da arquitetura atual: uso de `getSafeRedirectPath` em `login/page.tsx`, `login-service.ts`, `register/page.tsx` e `register-service.ts`, combinado com a validação de que `src/lib/security/redirect.ts` aplica checagens estritas (`parsed.origin`, `//` e `\`).

## 3. Nova Suíte Comportamental

- Criado `scripts/test-open-redirect-etapa-admin-01-1.mjs` executando diretamente `getSafeRedirectPath`, `GET` de `src/app/auth/callback/route.ts`, `loginWithSupabase`, `registerWithSupabase` e `requestPasswordRecovery`.
