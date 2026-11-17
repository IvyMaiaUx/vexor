# ETAPA 1.1 — CASOS DE ATAQUE E VETORES DE REDIRECIONAMENTO (`REDIRECT-ATTACK-CASES.md`)

**Utilitário auditado:** `getSafeRedirectPath` em `src/lib/security/redirect.ts`  
**Suíte comportamental:** `scripts/test-open-redirect-etapa-admin-01-1.mjs`

## 1. Vetores Maliciosos e Malformados Bloqueados (38 casos testados)

| Categoria | Exemplos testados | Resultado esperado e obtido |
|---|---|---|
| Domínio externo absoluto | `https://evil.example`, `http://evil.example/phish` | Fallback para `/catalog` |
| Protocol-relative / múltiplas barras | `//evil.example`, `///evil.example`, `\t//evil.example` | Fallback para `/catalog` |
| Backslashes literais | `\\evil.example`, `/\evil.example` | Fallback para `/catalog` |
| Barras invertidas codificadas | `/%5cevil.example`, `/%5Cevil.example`, `/%2f%5cevil.example` | Fallback para `/catalog` |
| Múltiplas codificações | `/%255cevil.example`, `/%252f%252fevil.example`, `https%3A%2F%2Fevil.example`, `%2F%2Fevil.example` | Fallback para `/catalog` |
| Barras codificadas | `/%2f/evil.example`, `/%2f%2fevil.example` | Fallback para `/catalog` |
| Caracteres de controle (crus e codificados) | `/catalog\nSet-Cookie: a=1`, `/catalog\r\nLocation: https://evil.example`, `/catalog\x00evil`, `/%0aevil.example`, `/%0d%0aSet-Cookie:a=1`, `/%00`, `/%7f` | Fallback para `/catalog` |
| Esquemas perigosos | `javascript:alert(1)`, `JAVASCRIPT:alert(1)`, `data:text/html,<script>alert(1)</script>`, `vbscript:msgbox(1)` | Fallback para `/catalog` |
| Loop para `/auth/callback` | `/auth/callback`, `/auth/callback?code=abc`, `/auth/callback/`, `/auth/callback/nested`, `/AUTH/callback`, `/%61uth/callback` | Fallback para `/catalog` |
| Vazios, nulos ou malformados | `""`, `"   "`, `null`, `undefined`, `/%E0%A4%A` | Fallback para `/catalog` |

## 2. Caminhos Internos Legítimos Preservados (6 casos testados)

- `/`
- `/profile`
- `/admin`
- `/cybercrime-research`
- `/catalog?q=nmap&page=2#top`
- `/admin/users?tab=1`

## 3. Fluxo do Callback (`/auth/callback`) e Serviços de Auth

- `GET /auth/callback` (com mock isolado de `exchangeCodeForSession`) manteve origem estrita `https://vexor.example` em todos os 9 cenários testados, incluindo `type=recovery`.
- `loginWithSupabase`, `registerWithSupabase` e `requestPasswordRecovery` sanitizaram alvos maliciosos para `/catalog` (ou `/auth/reset-password` na recuperação) e preservaram caminhos internos válidos.
