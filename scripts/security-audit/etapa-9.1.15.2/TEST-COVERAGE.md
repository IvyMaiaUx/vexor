# TEST-COVERAGE — Etapa 9.1.15.2 (FINDING-05)

## 1. Problema Identificado na Auditoria 9.1.15.1
O `FINDING-05` apontou cobertura insuficiente de testes comportamentais para os fluxos críticos de sincronização de sessão, tratamento de falha de logout e proteção server-side de `/cybercrime-research/*`.

## 2. Cobertura Implementada em `scripts/test-session-auth-etapa9-1-15.mjs`
A suíte comportamental executa 17 blocos de teste cobrindo:

- **Autorização e Rotas Protegidas (`Tests 1 & 4`, `2`, `3`, `5`, `6`, `16`):**
  - Regras de autorização server-side por papel/status (`active_member`, `admin`, etc.).
  - `Test 16`: proteção server-side de `/cybercrime-research` e `/cybercrime-research/*` via `evaluateProtectedRouteAccess()`, redirecionamento de não autenticados para `/login?next=...`, redirecionamento de autenticados sem elegibilidade para `/catalog` e preservação das rotas públicas (`/`, `/catalog`, `/forum`, `/login`, `/register`).
- **Sincronização de Sessão (`Tests 7, 8 & 9`, `10`, `11`, `12`, `14`, `15`):**
  - Deduplicação `single-flight` em chamadas concorrentes de sincronização.
  - Controle de `syncEpoch` contra condições de corrida.
  - Diferenciação entre sessão expirada/inexistente e indisponibilidade de rede/Supabase (evitando logout indevido em falha transitória).
- **Logout Consistente e Hardening (`Tests 13`, `13b`):**
  - `Test 13`: fluxo de logout bem-sucedido e deduplicação.
  - `Test 13b`: falha de rede no logout marcando `signOutError: true` com limpeza segura da sessão local, seguida de retry limpando `signOutError: false`.
