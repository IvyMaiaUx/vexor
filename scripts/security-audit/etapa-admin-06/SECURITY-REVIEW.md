# Revisão de Segurança — Etapa 6

1. **Autorização Server-Side e Client-Side:**
   - `src/app/admin/layout.tsx` mantém `requireServerAuthorization("moderator")` (`force-dynamic`), bloqueando não autenticados e membros comuns no servidor.
   - `SimulatedAdminModerationService` e `SimulatedAdminReportsService` exigem `hasModeratorAccess(actor)` (retornando `42501` / `statusCode: 403` para `member` ou contas suspensas).
   - Nenhuma autorização baseada em `localStorage` foi introduzida.
2. **Prevenção de XSS e Injeção:**
   - Nenhum componente de moderação utiliza `dangerouslySetInnerHTML`.
   - `analyzeUrlSafety()` bloqueia `javascript:`, `data:`, `vbscript:`, `file:` e `blob:` (inclusive com ofuscação por espaços/caracteres de controle), sem jamais fazer `fetch` ou abrir links automaticamente.
   - Links externos seguros exibidos no modal usam `rel="noopener noreferrer nofollow"`.
3. **Privacidade e Integridade do Banco:**
   - Identidade de denunciantes protegida (`reporterId: null`, `reporterUsername: "protected_reporter"`).
   - Zero uso de `service_role`, zero alterações em migrations/RLS/RPCs/triggers/GRANTs e zero escrita no Supabase remoto.
