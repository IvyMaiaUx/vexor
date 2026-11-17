# VEXOR — Etapa 9.6 — Revisão de Segurança

**Data:** 2026-11-15  

---

## 1. Controles de Segurança Verificados

1. **Ausência de `service_role` e segredos no cliente:**
   - Nenhum arquivo em `src/features/admin/` ou `src/app/api/admin/` referencia `service_role`.
   - `supabase-admin-provider.ts` é estritamente cliente e não importa `@/lib/supabase/server` nem `next/headers`.
2. **Proteção de dados sensíveis e privacidade:**
   - Listagem de usuários em `/api/admin/users` consulta apenas colunas públicas/administrativas permitidas em `public.profiles` (sem `email` de `auth.users`).
   - Listagem de denúncias em `/api/admin/reports` mascara `reporterId` e `reporterUsername` como `"protected"`.
   - Logs de auditoria passam por `sanitizeAuditMetadata()` antes de serem retornados ao cliente, redigindo chaves sensíveis como `email`, `token`, `password`, etc.
   - Exportação CSV em `/admin/audit` preserva proteção contra CSV Formula Injection (`audit-export.ts`).
3. **Integridade da auditoria:**
   - `/api/admin/audit` expõe apenas `GET` (somente leitura).
   - Nenhuma rota de aplicação grava em `audit_logs`; todas as gravações ocorrem exclusivamente dentro das RPCs `SECURITY DEFINER` do PostgreSQL.
4. **Validação estrita de entradas:**
   - Todos os IDs (`targetUserId`, `id`, `reportId`, `resourceId`) são validados como UUID antes de acionar consultas/RPCs.
   - `resolve_report` rejeita status `'open'`.
   - Ações inexistentes no backend (`escalate`, `request_revision`, moderação de `research`) são bloqueadas explicitamente com HTTP `400`.
5. **Tratamento de falhas sem fallback silencioso:**
   - Erros de banco ou autorização retornam códigos HTTP apropriados (`401`, `403`, `404`, `409`, `400`, `503`) via `mapSupabaseAdminError`, nunca mascarando falhas com dados simulados.
