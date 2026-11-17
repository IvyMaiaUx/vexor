# VEXOR — Etapa 9.0: Mapeamento de Banco de Dados

Inventário completo extraído diretamente das migrations oficiais em `supabase/migrations/`:
- `20261110000001_schema.sql`
- `20261110000002_functions_triggers.sql`
- `20261110000003_rls_and_grants.sql`

---

## 1. ENUMs Definidos (`20261110000001_schema.sql`)

- `public.user_role`
- `public.category_scope`
- `public.resource_type`
- `public.difficulty_level`
- `public.resource_status`
- `public.content_status`
- `public.report_status` (referenciado nas assinaturas de RPCs em `20261110000003_rls_and_grants.sql`)

---

## 2. Tabelas e Relacionamentos (`public`)

| Tabela | Chaves Estrangeiras (`references`) | Uso Pretendido na Aplicação |
| --- | --- | --- |
| `public.profiles` | `id -> auth.users(id) on delete cascade` | Perfil de usuário, papel (`role`), status de suspensão (`is_suspended`), bio, avatar, interesses |
| `public.categories` | — | Categorias de catálogo e fórum (`category_scope`) |
| `public.resources` | `category_id -> categories(id)`, `submitted_by -> profiles(id)`, `reviewed_by -> profiles(id)` | Recursos submetidos e aprovados do catálogo |
| `public.topics` | `author_id -> profiles(id)`, `category_id -> categories(id)` | Tópicos do fórum |
| `public.posts` | `topic_id -> topics(id)`, `author_id -> profiles(id)`, auto-referência `(id, topic_id) -> posts(id, topic_id)` | Respostas/comentários em tópicos do fórum |
| `public.tags` | — | Tags de tópicos |
| `public.topic_tags` | `topic_id -> topics(id)`, `tag_id -> tags(id)` | Relação N:N entre tópicos e tags (limitada por trigger `topic_tags_limit()`) |
| `public.votes` | `user_id -> profiles(id)`, `post_id -> posts(id)` | Votos em respostas do fórum |
| `public.bookmarks` | `user_id -> profiles(id)`, `resource_id -> resources(id)` | Favoritos do catálogo por usuário |
| `public.reports` | `reporter_id -> profiles(id)`, `topic_id -> topics(id)`, `post_id -> posts(id)`, `resource_id -> resources(id)`, `profile_id -> profiles(id)`, `handled_by -> profiles(id)` | Denúncias de tópicos, posts, recursos ou perfis |
| `public.notifications` | `user_id -> profiles(id)`, `actor_id -> profiles(id)`, `topic_id -> topics(id)`, `post_id -> posts(id)`, `resource_id -> resources(id)` | Notificações de usuário (`read_at` atualizável pelo próprio usuário) |
| `public.audit_logs` | `actor_id -> profiles(id)` | Trilha imutável de auditoria administrativa (bloqueada contra `UPDATE`/`DELETE` por trigger) |

---

## 3. Views e Storage

- **View:** `public.public_profiles` — exposição pública segura de perfis (consumida por `profile-service.ts`).
- **Storage Bucket:** `avatars` (`storage.buckets` + políticas `avatars_insert_own`, `avatars_update_own`, `avatars_delete_own` em `storage.objects`).

---

## 4. Funções, Triggers e RPCs (`20261110000002_functions_triggers.sql`)

### 4.1 Helpers e Triggers Internos (execução revogada de `public`, `anon`, `authenticated`)
- `set_updated_at()`
- `current_user_role()`
- `is_active_member()`
- `is_moderator()`
- `is_admin()`
- `topic_has_replies(uuid)`
- `write_audit_log(text, text, uuid, jsonb)`
- `audit_logs_block_mutation()`
- `on_category_changed()`
- `handle_new_user()`
- `resources_set_slug()`
- `on_post_created()`
- `on_vote_changed()`
- `topic_tags_limit()`

### 4.2 RPCs Executáveis por `authenticated` (`grant execute ... to authenticated`)
| RPC | Assinatura | Propósito |
| --- | --- | --- |
| `admin_set_user_role` | `(uuid, public.user_role)` | Alteração de papel por administrador com auditoria |
| `admin_set_user_suspension` | `(uuid, boolean, text)` | Suspensão/reativação de usuário com motivo e auditoria |
| `moderate_resource` | `(uuid, public.resource_status, text)` | Aprovação/rejeição/moderação de recurso |
| `resubmit_resource` | `(uuid)` | Reenvio de recurso pelo autor após ajustes |
| `moderate_topic` | `(uuid, text, text)` | Moderação de tópico do fórum |
| `moderate_post` | `(uuid, text, text)` | Moderação de resposta do fórum |
| `resolve_report` | `(uuid, public.report_status, text)` | Resolução/descarte de denúncia |
| `set_accepted_post` | `(uuid, uuid)` | Marcação de resposta aceita em tópico |

---

## 5. Lacunas Identificadas entre Frontend e Schema

1. **Zero chamadas `.rpc(...)` no frontend:** nenhuma das 8 RPCs oficiais é invocada atualmente em `src/`.
2. **Cybercrime Research sem modelagem dedicada:** o módulo espera campos como `domain` (`malware`, `ransomware`, `apt`, `darkweb`, `fraud`), `severity`, `tlp`, `cves`, `attackTechniques`, além de tipos específicos (`AnalysisLabGuide`, `CaseStudy`, `ResearchArticle`, `TechnicalDiscussion`). O schema atual não possui tabelas próprias nem colunas correspondentes em `resources` ou `topics`.
3. **Activity Feed vs `notifications`:** `use-activity-store.ts` registra ações locais de navegação (`view:resource:...`, `bookmark:...`, `reply:...`), enquanto `public.notifications` modela notificações direcionadas a `user_id` geradas por eventos do sistema.
4. **Contrato `IAdminDataProvider`:** `src/features/admin/types.ts` e `admin-provider.ts` já isolam o painel administrativo atrás de uma interface única, facilitando a substituição de `createSimulatedAdminProvider()` por um `createSupabaseAdminProvider()` (ou server actions / route handlers autenticados).
