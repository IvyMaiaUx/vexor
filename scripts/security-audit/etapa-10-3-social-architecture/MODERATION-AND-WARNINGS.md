# VEXOR — Etapa 10.3: Moderação Pós-Publicação e Sistema de Advertências

## 1. Fluxo de Publicação Imediata + Moderação Posterior
- **Publicação imediata:** `topics` e `posts` continuam nascendo com `status = 'published'` por padrão (sem fila prévia de aprovação administrativa).
- **Denúncias sem remoção automática:** Ao receber uma denúncia (`public.reports`), o item **permanece** com `status = 'published'` até que um moderador avalie na fila (`/admin/moderation` e `/admin/reports`). Denúncias alimentam a fila, nunca ocultam conteúdo automaticamente (evita censura abusiva por denúncia coordenada).
- **Ações do moderador:**
  - `hide` (`status -> 'hidden'`): conteúdo sai da timeline/fórum, autor é notificado (`content_hidden`), log gravado em `audit_logs`.
  - `unhide` (`status -> 'published'`): conteúdo restaurado, log gravado em `audit_logs`.
  - `delete` (`status -> 'deleted'`): soft-delete preservando integridade referencial e auditoria; autor notificado (`content_removed`).
  - Motivos padronizados: reutilizar `report_reason` ou catálogo de motivos padronizados (`spam`, `harassment`, `malicious_content`, `personal_data`, `unauthorized_attack`, `copyright`, `off_topic`, `other`) com justificativa obrigatória.

## 2. Sistema de Advertências (`public.user_warnings`)
Advertências formais são **distintas** de suspensão (`profiles.is_suspended`): um usuário advertido continua ativo (a menos que acumule ou receba suspensão explícita), mas recebe notificação formal e registro auditável.

### Estrutura proposta para `public.user_warnings`:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade` (usuário advertido)
- `moderator_id uuid references public.profiles(id) on delete set null` (moderador responsável)
- `reason public.report_reason not null` (motivo padronizado)
- `severity text not null check (severity in ('low', 'medium', 'high'))`
- `description text not null` (`10..1500` chars)
- `topic_id uuid references public.topics(id) on delete set null`
- `post_id uuid references public.posts(id) on delete set null`
- `report_id uuid references public.reports(id) on delete set null`
- `status text not null default 'active' check (status in ('active', 'acknowledged', 'revoked'))`
- `acknowledged_at timestamptz`
- `revoked_by uuid references public.profiles(id) on delete set null`
- `revoked_at timestamptz`
- `created_at timestamptz not null default now()`

### RPCs e Auditoria
- `issue_user_warning(...)`: `SECURITY DEFINER`, exige `is_moderator()`, impede advertir a si mesmo ou que `moderator` advirta `admin`, insere em `user_warnings`, insere notificação `user_warning` para o usuário e grava `warning.issued` em `audit_logs`.
- `acknowledge_user_warning(p_warning_id uuid)`: permite apenas ao próprio usuário advertido marcar ciência (`status = 'acknowledged'`).
- `revoke_user_warning(p_warning_id uuid, p_reason text)`: exige `is_admin()` (ou moderador autorizado), marca `revoked` e registra `warning.revoked` em `audit_logs`.

## 3. Distinção Explícita de Estados
| Evento / Estado | Onde é registrado | Impacto no acesso |
| :--- | :--- | :--- |
| Denúncia recebida | `reports.status = 'open'` | Nenhum impacto automático no autor ou no conteúdo |
| Conteúdo ocultado | `topics/posts.status = 'hidden'` | Invisível para membros; restaurável por moderador |
| Conteúdo removido | `topics/posts.status = 'deleted'` | Removido da visualização; registro preservado para auditoria |
| Usuário advertido | `user_warnings.status = 'active'` | Usuário recebe notificação e aviso; **não** perde acesso |
| Usuário suspenso | `profiles.is_suspended = true` | Bloqueio total de mutações e áreas restritas (`is_active_member() = false`) |
