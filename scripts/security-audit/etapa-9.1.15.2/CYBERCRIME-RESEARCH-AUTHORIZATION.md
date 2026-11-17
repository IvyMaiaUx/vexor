# CYBERCRIME-RESEARCH-AUTHORIZATION — Etapa 9.1.15.2 (FINDING-01)

## 1. Problema Identificado na Auditoria 9.1.15.1
Na Etapa 9.1.15.1, o `FINDING-01` apontou que as rotas `/cybercrime-research` e `/cybercrime-research/*` dependiam apenas de guards client-side (`ResearchAccessGuard`), sem bloqueio server-side no proxy (`src/proxy.ts`), na matriz `evaluateProtectedRouteAccess()` (`src/lib/supabase/auth.ts`) ou em layout server-side dedicado.

## 2. Escopo das Rotas
Foi verificado que as 6 páginas sob `src/app/cybercrime-research/` envolvem seu conteúdo integralmente com `<ResearchAccessGuard>`, não existindo subpáginas públicas dentro desse segmento.

Todas as páginas públicas da plataforma (`/`, `/catalog`, `/forum`, `/login`, `/register`, `/forgot-password`, `/reset-password`) permanecem fora de `/cybercrime-research/` e continuam com acesso livre.

## 3. Correções Aplicadas

### 3.1. `src/lib/supabase/auth.ts`
- Atualizada a função `evaluateProtectedRouteAccess()` para classificar `/cybercrime-research` e `/cybercrime-research/*` como área protegida com nível mínimo `active_member`:
  - Usuário não autenticado (`unauthenticated`): redireciona para `/login?next=...`.
  - Usuário autenticado sem elegibilidade `active_member`: redireciona para `/catalog`.
  - Rotas públicas continuam retornando `{ action: "allow" }`.

### 3.2. `src/proxy.ts`
- Atualizada a verificação `isProtectedArea` para incluir `/cybercrime-research` e `/cybercrime-research/*`, garantindo que requisições sem sessão válida ou sem permissão sejam interceptadas já na camada de proxy SSR antes da renderização.

### 3.3. `src/app/cybercrime-research/layout.tsx`
- Criado Server Component com `export const dynamic = "force-dynamic"` que executa `await requireServerAuthorization("active_member")` no servidor.
- Caso a autorização falhe no servidor, realiza redirecionamento server-side antes de entregar qualquer conteúdo ou payload da árvore `/cybercrime-research/*`.

## 4. Verificação
- Testado no bloco `Test 16` de `scripts/test-session-auth-etapa9-1-15.mjs`, validando o comportamento de `evaluateProtectedRouteAccess()` para `/cybercrime-research`, subrotas `/cybercrime-research/*` e preservação das rotas públicas.
