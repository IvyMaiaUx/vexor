# ETAPA 2 — REVISÃO DE SEGURANÇA (`SECURITY-REVIEW.md`)

## Controles Preservados

1. **Autorização no Servidor:**
   - `src/app/admin/layout.tsx` mantém `requireServerAuthorization("moderator")`.
   - `src/proxy.ts` continua interceptando `/admin` e `/admin/*` no servidor via `resolveServerSessionWithClient()` + `evaluateProtectedRouteAccess()`.
   - `src/app/admin/users/layout.tsx` e `src/app/admin/audit/layout.tsx` preservam `requireServerAuthorization("admin")`.
2. **Privacidade e Minimização de Dados:**
   - Nenhum e-mail ou dado sensível é exibido nos cartões, prévias ou timeline.
   - `AdminReportsPreview` omite propositalmente `reporterUsername` e `reporterId`.
3. **Isolamento de Dados Simulados:**
   - `adminDataProvider.isSimulated === true` e `stats.isSimulatedDemoData === true` são exibidos explicitamente no cabeçalho e no aviso do Dashboard.
   - Zero uso de `localStorage`, `service_role` ou mutações remotas no Supabase.
4. **Ausência de Mutações na Etapa 2:**
   - A prévia da fila de moderação é estritamente somente leitura; nenhuma ação destrutiva ou de aprovação é executada no Dashboard.
