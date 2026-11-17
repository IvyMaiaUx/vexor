# TEST-RESULTS — Etapa 9.1.15.2.2

## 1. Comparação com a Auditoria Anterior (9.1.15.2.1)

| Verificação | 9.1.15.2.1 | 9.1.15.2.2 | Detalhes |
|-------------|------------|------------|----------|
| `node scripts/test-session-auth-etapa9-1-15.mjs` | Exit code `0` (17 blocos) | Exit code `0` (17 blocos + 3 blocos runtime reais) | Adicionada verificação de preservação de `signOutError` em sincronização automática (`Test 13b`) e executados `Runtime Test A` (`POST /api/auth/logout`), `Runtime Test B` (layouts server-side) e `Runtime Test C` (`<SignOutErrorBanner />`). |
| `npx tsc --noEmit` | Exit code `0` | Exit code `0` | Sem erros de tipagem. |
| `npm run lint` | Exit code `0` (0 erros, 2 warnings) | Exit code `0` (0 erros, 2 warnings) | Mantidos exclusivamente os 2 warnings pré-existentes em `scripts/security-audit/run-all-tests.mjs` (linhas `156:16` e `193:44`). |
| `npx next build --webpack` | Pendente ambiental (`EPERM` em `.next`) | Pendente ambiental (`EPERM` em `.next`) | Não executado por restrição de ACL em `.next` (`DESKTOP-G3BH48T\CodexSandboxUsers` sem permissão `Write`). |

## 2. Saída Completa da Suíte (`node scripts/test-session-auth-etapa9-1-15.mjs`)
- `Tests 1 & 4`, `2`, `3`, `5`, `6`, `7, 8 & 9`, `10`, `11`, `12`, `13`, `13b`, `14`, `15`, `16`: **PASSARAM**
- `Runtime Test A` (`POST /api/auth/logout` — HTTP 200/500, `Cache-Control: no-store`, zero vazamento de segredos): **PASSOU**
- `Runtime Test B` (`AdminLayout`, `AdminUsersLayout`, `AdminAuditLayout`, `CybercrimeResearchLayout` executados diretamente): **PASSOU**
- `Runtime Test C` (`<SignOutErrorBanner />` com `role="alert"`, retry, `disabled={isSigningOut}`, preservação em auto-sync): **PASSOU**
