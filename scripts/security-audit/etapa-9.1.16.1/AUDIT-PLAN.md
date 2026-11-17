# AUDIT-PLAN — Etapa 9.1.16.1 (Auditoria Independente de Recuperação de Senha)

## 1. Objetivo
Realizar auditoria técnica e de segurança independente sobre a Etapa 9.1.16 (recuperação de senha com Supabase Auth), exclusivamente em modo leitura, sem implementar correções nem alterar configurações remotas ou locais.

## 2. Escopo Inspecionado
- `src/features/auth/recovery-service.ts`
- `src/app/auth/callback/route.ts`
- `src/app/auth/reset-password/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/reset-password/page.tsx`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/auth.ts`
- `src/lib/security/redirect.ts`
- `src/features/auth/session-sync.ts`
- `src/features/auth/login-service.ts`
- `src/features/auth/register-service.ts`
- `src/lib/i18n/dictionaries.ts`
- `scripts/test-password-recovery-etapa9-1-16.mjs`
- `scripts/test-session-auth-etapa9-1-15.mjs`
- Documentação em `scripts/security-audit/etapa-9.1.16/`

## 3. Verificações Técnicas Executadas
- `node scripts/test-password-recovery-etapa9-1-16.mjs`
- `node scripts/test-session-auth-etapa9-1-15.mjs`
- `npx tsc --noEmit`
- `npm run lint`
- Build de produção (`npx next build --webpack`) mantido não executado por restrição ambiental conhecida de ACL em `.next`.
