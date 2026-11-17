# VEXOR — Etapa 9.0: Matriz de Integração Backend

Classificação utilizada:
- **REAL**: conectado ao Supabase Auth/Database/SSR em produção local.
- **PARCIAL**: parte real no Supabase, mas com lacunas ou dependências pendentes.
- **SIMULADA**: usa dados estáticos em memória e/ou `localStorage`.
- **PENDENTE**: contrato/estrutura no banco ainda precisa de ajuste, extensão ou decisão antes da integração.
- **BLOQUEADA**: depende de autorização explícita, recurso externo ou pré-requisito ainda não liberado.

---

| Módulo / Funcionalidade | Estado | Evidência no Código | Alvo no Supabase | Lacunas / Observações |
| --- | --- | --- | --- | --- |
| Cadastro e confirmação de e-mail | **REAL** | `src/features/auth/register-service.ts`, `src/app/auth/callback/route.ts` | `auth.users` + trigger `handle_new_user()` -> `public.profiles` | Fluxo funcional; testes automatizados de envio real de e-mail permanecem fora do escopo sem autorização. |
| Login e logout | **REAL** | `src/features/auth/login-service.ts`, `src/app/api/auth/logout/route.ts` | `auth.signInWithPassword`, `auth.signOut` | Integrado ao SSR e `getSafeRedirectPath`. |
| Recuperação e redefinição de senha | **REAL** | `src/features/auth/recovery-service.ts`, `src/app/auth/reset-password/page.tsx` | `auth.resetPasswordForEmail`, `auth.updateUser` | Integrado. |
| Sincronização de sessão e proteção de rotas | **REAL** | `src/proxy.ts`, `src/lib/supabase/auth.ts`, `src/app/api/auth/session/route.ts` | `auth.getUser()`, `public.profiles` | Autorização server-side real para `member`, `moderator` e `admin`. |
| Leitura e edição de perfil próprio | **REAL** | `src/features/profile/profile-service.ts` | `public.profiles`, `public.public_profiles` | Protegido por `FORBIDDEN_UPDATE_FIELDS` no app + `grant update (...)` por coluna no DB. |
| Upload binário de avatar | **PARCIAL** | `src/features/profile/profile-edit-modal.tsx` | Bucket `avatars` (`storage.objects`) | Bucket e políticas RLS já existem no DB, mas a UI aceita apenas `avatarUrl` em texto sem upload de arquivo para o Storage. |
| Catálogo de recursos e submissão | **SIMULADA** | `src/features/catalog/use-catalog-store.ts` | `public.resources`, `public.categories` | Usa `FEATURED_RESOURCES` + `localStorage` (`cybersec_submitted_resources`). |
| Favoritos (Bookmarks) | **SIMULADA** | `src/features/catalog/use-catalog-store.ts` | `public.bookmarks` | Usa `localStorage` (`cybersec_bookmarks`). |
| Fórum (tópicos, respostas, votos, tags) | **SIMULADA** | `src/features/forum/use-forum-store.ts` | `public.topics`, `public.posts`, `public.votes`, `public.tags`, `public.topic_tags`, RPC `set_accepted_post` | Usa `INITIAL_TOPICS`, `INITIAL_POSTS` e `localStorage`. |
| Atividade e Notificações | **SIMULADA** | `src/features/activity/use-activity-store.ts` | `public.notifications` | Usa `INITIAL_ACTIVITIES` + `localStorage` (`cybersec_user_activities`). Tabela `notifications` cobre notificações, não necessariamente todo log de atividade de navegação. |
| Cybercrime Research (artigos, cases, lab guides) | **SIMULADA / PENDENTE** | `src/features/cybercrime-research/services/research-service.ts` | Sem tabela dedicada (candidato: `public.resources` ou nova tabela/migration) | Usa arrays estáticos + `localStorage` (`vexor_admin_research_queue`). Schema atual não tem colunas específicas (`tlp`, `severity`, `cves`, `attack_techniques`, `domain`). |
| Admin Dashboard | **SIMULADA** | `src/features/admin/services/dashboard-service.ts`, `admin-provider.ts` | Views/queries agregadas sobre `profiles`, `resources`, `topics`, `posts`, `reports`, `audit_logs` | Consome `createSimulatedAdminProvider()`. |
| Admin Gestão de Usuários (papel e suspensão) | **SIMULADA** | `src/features/admin/services/users-service.ts`, `admin-provider.ts` | `public.profiles`, RPCs `admin_set_user_role`, `admin_set_user_suspension` | Zero chamadas `.rpc(...)` no frontend atualmente. |
| Admin Moderação de Conteúdo | **SIMULADA** | `src/features/admin/services/moderation-service.ts`, `admin-provider.ts` | `public.resources`, `public.topics`, `public.posts`, RPCs `moderate_resource`, `moderate_topic`, `moderate_post`, `resubmit_resource` | Consome fila simulada em memória. |
| Admin Denúncias (Reports) | **SIMULADA** | `src/features/admin/services/reports-service.ts`, `admin-provider.ts` | `public.reports`, RPC `resolve_report` | Consome `SIMULATED_REPORTS`. Fluxo de criação de denúncia no frontend público também precisa estar ligado a `public.reports`. |
| Admin Logs de Auditoria | **SIMULADA** | `src/features/admin/services/audit-service.ts`, `admin-provider.ts` | `public.audit_logs` | Tabela `audit_logs` é append-only via `write_audit_log` (triggered/RPCs) e leitura restrita a `admin`. |
