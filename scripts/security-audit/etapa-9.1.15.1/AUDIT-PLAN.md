# ETAPA 9.1.15.1 — AUDIT PLAN

- **Data:** 2026-11-13
- **Natureza:** Auditoria técnica independente (somente leitura e evidências; zero alterações de implementação, migrations, RLS ou Supabase remoto).

## 1. Escopo Inspecionado

- `src/lib/supabase/auth.ts`, `client.ts`, `server.ts`, `src/proxy.ts`
- `src/app/api/auth/session/route.ts`, `src/app/api/auth/logout/route.ts`
- `src/features/auth/session-sync.ts`, `src/features/auth/use-auth-store.ts`
- `src/components/auth/auth-session-sync.tsx`, `src/app/layout.tsx`
- `src/app/admin/layout.tsx`, `src/app/admin/users/layout.tsx`, `src/app/admin/audit/layout.tsx`
- `src/features/admin/components/admin-guard.tsx`, `admin-layout-shell.tsx`
- `src/features/cybercrime-research/components/research-access-guard.tsx`
- `scripts/test-session-auth-etapa9-1-15.mjs`
- `src/types/database.types.ts` e migrations de referência (`20261110000001_schema.sql`, `20261110000002_functions_triggers.sql`, `20261110000003_rls_and_grants.sql`)

## 2. Metodologia

1. Revisão estática linha a linha dos fluxos de identidade, perfil, autorização, sincronização e logout.
2. Busca por Server Actions (`"use server"`) e rotas em `src/app/api/` para identificar operações privilegiadas sem validação server-side.
3. Reexecução independente de `scripts/test-session-auth-etapa9-1-15.mjs`, `npx tsc --noEmit`, `npm run lint`.
4. Investigação de ACL (`Get-Acl .next`), processos Node (`Get-Process -Name node`) e tentativa controlada de `npx next build --webpack`.
