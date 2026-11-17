# AUDIT-PLAN — Etapa 9.1.15.2.1 (Auditoria Independente Pós-Correção)

## 1. Objetivo
Validar de forma independente as correções implementadas na Etapa 9.1.15.2 para `FINDING-01`, `FINDING-04` e `FINDING-05`, bem como confirmar a integridade do workspace e o status ambiental do `FINDING-06`, sem modificar código-fonte, banco remoto, migrations, RLS, `.env.local`, dependências ou ACLs do Windows.

## 2. Escopo Inspecionado
- **FINDING-01 (Cybercrime Research):**
  - `src/lib/supabase/auth.ts`
  - `src/proxy.ts`
  - `src/app/cybercrime-research/layout.tsx`
  - Todas as 6 páginas em `src/app/cybercrime-research/`
  - `src/features/cybercrime-research/components/research-access-guard.tsx`
  - `src/lib/security/redirect.ts`
- **FINDING-04 (Logout):**
  - `src/features/auth/session-sync.ts`
  - `src/features/auth/use-auth-store.ts`
  - `src/components/auth/sign-out-error-banner.tsx`
  - `src/components/auth/auth-session-sync.tsx`
  - `src/components/layout/header.tsx`
  - `src/features/admin/components/admin-layout-shell.tsx`
  - `src/app/api/auth/logout/route.ts`
  - `src/lib/i18n/dictionaries.ts`
- **FINDING-05 (Testes):**
  - `scripts/test-session-auth-etapa9-1-15.mjs`
- **Verificações Técnicas e Integridade:**
  - `node scripts/test-session-auth-etapa9-1-15.mjs`
  - `npx tsc --noEmit`
  - `npm run lint`
  - Inspeção read-only de `package.json`, `supabase/` e ACL de `.next`.

## 3. Critérios de Classificação
- `APROVADO`
- `APROVADO COM RESSALVAS`
- `REPROVADO`
- `NÃO VERIFICADO`
