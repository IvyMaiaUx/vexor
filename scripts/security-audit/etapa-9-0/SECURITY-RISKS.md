# VEXOR — Etapa 9.0: Riscos de Segurança e Armadilhas de Integração

---

## 1. Riscos Identificados no Estado Atual e na Transição

| ID | Severidade | Risco / Lacuna | Impacto | Mitigação Recomendada |
| --- | --- | --- | --- | --- |
| **SR-01** | **Alta** | **Persistência local em `localStorage` em módulos de negócio** (`catalog`, `forum`, `activity`, `cybercrime-research`) | Dados submetidos pelo usuário não são compartilhados, não passam por RLS, podem ser manipulados no DevTools e se perdem ao trocar de navegador/dispositivo. | Migrar gradualmente cada store para queries Supabase autenticadas, mantendo validação de entrada e tratando `localStorage` apenas para preferências não sensíveis (ex: `cybersec_locale`). |
| **SR-02** | **Alta** | **Painel Administrativo inteiramente em memória (`createSimulatedAdminProvider`)** | Ações de moderação, suspensão, troca de papel, resolução de denúncias e logs de auditoria não persistem nem refletem o estado real do PostgreSQL. | Implementar `createSupabaseAdminProvider()` usando exclusivamente sessões autenticadas via `@supabase/ssr` e as RPCs `SECURITY DEFINER` oficiais. Nunca expor `service_role` no cliente ou em rotas públicas. |
| **SR-03** | **Média** | **Assimetria `moderator` vs `admin` no `AdminLayout`** | `src/app/admin/layout.tsx` autoriza `moderator`, mas `audit_logs`, `categories` e RPCs de usuário (`admin_set_user_role`, `admin_set_user_suspension`) exigem `admin` no banco. | Adicionar guarda de rota/página explícita para `admin` em `/admin/audit` e nas ações administrativas exclusivas de `admin`, além de esconder/desabilitar controles não permitidos ao papel `moderator` na UI. |
| **SR-04** | **Média** | **Divergência de schema para `cybercrime-research`** | O módulo possui metadados de Threat Intel (`domain`, `severity`, `tlp`, `cves`, `attackTechniques`) sem colunas/tabelas correspondentes nas 3 migrations oficiais. | Decidir em etapa dedicada de modelagem antes da integração: criar migration oficial (`research_articles` / `research_submissions`) ou mapear para `resources` + metadados estruturados com RLS equivalente. |
| **SR-05** | **Média** | **Avatar URL arbitrária sem upload ao bucket `avatars`** | `profile-edit-modal.tsx` aceita string `avatarUrl` externa em vez de enviar arquivo para `storage.objects` (`avatars`), podendo gerar links quebrados ou dependência de hosts externos. | Integrar upload direto ao bucket `avatars` respeitando o path `{user_id}/...` exigido pelas políticas `avatars_*_own` e validando MIME/tamanho antes do upload. |
| **SR-06** | **Média** | **Exposição de e-mails ou dados privados em listagens** | Consultas em `profiles` no painel admin ou listagens públicas podem vazar colunas restritas se não usarem `public_profiles` ou projeções explícitas. | Usar `public.public_profiles` para visões públicas/fórum/catálogo e restringir consultas completas de `profiles` ao contexto autenticado de `admin`/`moderator` conforme RLS. |
| **SR-07** | **Baixa** | **Dessincronização de contadores locais vs triggers do PostgreSQL** | Frontend simulado calcula contadores no cliente; no banco real, triggers (`on_post_created`, `on_vote_changed`) atualizam contadores no servidor. | Não enviar campos derivados em `INSERT`/`UPDATE` e revalidar/rebuscar o estado do servidor após mutações. |

---

## 2. Garantias Já Validadas que Devem Ser Preservadas

- **Autenticação SSR com `getUser()`:** não regredir para `getSession()` confiando em payload de cookie sem validação remota.
- **Proteção contra Open Redirect:** manter `getSafeRedirectPath` em `src/lib/security/redirect.ts` e `/auth/callback`.
- **Bloqueio de escalonamento de privilégio no perfil:** manter `FORBIDDEN_UPDATE_FIELDS` em `profile-service.ts` em conjunto com o `grant update (...)` por coluna no banco.
- **Sem `service_role` no código da aplicação:** todas as operações administrativas da plataforma devem rodar com o JWT do usuário autenticado submetido às RPCs `SECURITY DEFINER` e políticas RLS.
