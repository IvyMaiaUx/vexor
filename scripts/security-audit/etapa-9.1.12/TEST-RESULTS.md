# Etapa 9.1.12 — Test Results

- **Data:** 2026-11-13

## 1. Testes executados e aprovados (`exit_code = 0`)

1. **`node scripts/test-auth-infra-etapa9-1-12.mjs`** (`exit_code = 0`):
   - `getSafeRedirectPath`: validou caminhos internos (`/profile`, `/admin/users?tab=1#top`) e bloqueou `null`, `undefined`, `""`, `"   "`, `"https://evil.com"`, `"http://evil.com/login"`, `"//evil.com"`, `"/\\evil.com"`, `"javascript:alert(1)"`, caracteres de controle (`\n`) e loop para `/auth/callback?code=abc`.
   - `src/lib/supabase/client.ts`: confirmado `createBrowserClient` sem `service_role` ou `SUPABASE_SERVICE_ROLE_KEY`.
   - `src/lib/supabase/server.ts`: confirmado `createServerClient`, `await cookies()`, `getAll()`/`setAll()`, sem singleton e sem `service_role`.
   - `src/lib/supabase/auth.ts`: confirmado `supabase.auth.getUser()`, sem uso de `localStorage` e sem `service_role`.
   - `src/app/auth/callback/route.ts` e `src/proxy.ts`: confirmados `exchangeCodeForSession`, `getSafeRedirectPath`, tratamento de `code` ausente/erro (`auth_callback_failed`), `updateSession` e `getUser()`.
   - `src/features/auth/use-auth-store.ts`: confirmado que `DEMO_PROFILES` e `useAuthStore` permanecem preservados.
2. **`npx tsc --noEmit`** (`exit_code = 0`): zero erros de TypeScript.
3. **`npm run lint`** (`exit_code = 0`): zero erros (`2` warnings pré-existentes em `scripts/security-audit/run-all-tests.mjs`).

## 2. Build de produção (`next build`) — Limitação de sandbox Windows

- **`npm run build` (Turbopack):** `exit_code = 1` — falha de spawn de processo filho PostCSS no sandbox Windows (`creating new process - node process exited before we could connect to it with exit code: 0`).
- **`npx next build --webpack` (3 tentativas no sandbox):** `exit_code = 1` — falha intermitente de permissão do sandbox Windows ao criar subdiretórios em `.next\` (`EPERM: operation not permitted, mkdir ...\.next\...`).

## 3. Testes não executados por restrição da etapa

- Troca real de código PKCE (`exchangeCodeForSession`) contra o Supabase Auth remoto, pois a criação de usuários reais e escrita no Supabase remoto estão proibidas nesta etapa.
