# ETAPA 9.1.15 — Security Review

- **Data:** 2026-11-13

## Controles Auditados

1. **Identidade validada por `getUser()` no servidor:** `src/proxy.ts` e `src/lib/supabase/auth.ts` nunca confiam em `getSession()` ou `localStorage` como autoridade.
2. **Prevenção de escalação de privilégios no cliente:** Manipulações manuais em `localStorage` (`role: "admin"`) são ignoradas pelo servidor (`proxy.ts`, `/api/auth/session`, `requireServerAuthorization`) e sobrescritas na UI por `syncClientSessionFromServer()`.
3. **Sem fallback silencioso para `DEMO_PROFILES`:** Erros de rede ou indisponibilidade do Supabase resultam em `connection_error` (`503`), nunca autenticando usuários demo automaticamente.
4. **Separação explícita de `DEMO_PROFILES`:** `authMode: "demo"` só é ativado por seleção explícita no simulador offline, permanecendo isolado da sessão Supabase (`authMode: "supabase"`).
5. **Zero armazenamento de senhas/tokens manuais:** Nenhuma senha ou JWT manual é gravado em `localStorage`, `sessionStorage` ou cookies manuais.
6. **Escopo e banco remoto intactos:** Nenhuma migration, SQL remoto, policy RLS, `.env.local` ou configuração do Supabase Auth foi modificada.
