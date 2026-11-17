# ETAPA 1.1 — ANÁLISE INICIAL DO ALERTA DE OPEN REDIRECT (`INITIAL-ANALYSIS.md`)

**Projeto:** VEXOR  
**Alvo:** `scripts/test-audit-etapa8.mjs` (passo `[5/8]`)  
**Mensagem observada antes da investigação:** `AssertionError [ERR_ASSERTION]: Vulnerabilidade Open Redirect detectada no LoginPage!`

## 1. Diagnóstico da Causa Raiz

O alerta observado em `scripts/test-audit-etapa8.mjs` **não indicava ausência de proteção no fluxo de login**, mas sim **um falso positivo de um teste estático legado** (incompatibilidade entre o teste da Etapa 8 e a arquitetura implementada a partir das Etapas 9.1.12–9.1.14).

Evidências:
1. Na Etapa 8 (pré-integração Supabase), `src/app/login/page.tsx` e `src/app/register/page.tsx` possuíam uma verificação inline simples: `next.startsWith("/") && !next.startsWith("//")`.
2. Nas Etapas 9.1.12, 9.1.13 e 9.1.14, essa lógica foi extraída e substituída pelo utilitário centralizado `getSafeRedirectPath()` em `src/lib/security/redirect.ts`.
3. `scripts/test-audit-etapa8.mjs` (linhas 124–131) continuava buscando literalmente a substring `'next.startsWith("/") && !next.startsWith("//")'` dentro de `src/app/login/page.tsx` e `src/app/register/page.tsx`.

## 2. Fluxo Real de Redirecionamento Auditado

Todos os fluxos de autenticação e proteção de rotas convergem para `getSafeRedirectPath()` (`src/lib/security/redirect.ts`):
- `src/app/login/page.tsx` -> `loginWithSupabase()` (`src/features/auth/login-service.ts`) e `handleDemoSignIn` -> `getSafeRedirectPath()` -> `router.push(...)`
- `src/app/register/page.tsx` -> `getSafeRedirectPath()` -> `registerWithSupabase()` (`src/features/auth/register-service.ts`) -> `getSafeRedirectPath()` -> `emailRedirectTo` (`/auth/callback?next=...`) ou `router.push(result.safeRedirectPath)`
- `src/app/auth/callback/route.ts` -> `getSafeRedirectPath(searchParams.get("next"), ...)` -> `NextResponse.redirect(new URL(safeNext, request.url))`
- `src/features/auth/recovery-service.ts` -> `getSafeRedirectPath(input.nextPath ?? "/auth/reset-password", "/auth/reset-password")`
- `src/lib/supabase/auth.ts` + `src/proxy.ts` -> `getSafeRedirectPath(pathname, defaultNext)` -> `/login?next=...`
