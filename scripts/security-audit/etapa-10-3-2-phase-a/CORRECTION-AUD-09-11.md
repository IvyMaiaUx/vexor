# CORREÇÕES AUD-09 A AUD-11

## AUD-09 — Compatibilidade de ENUMs com Migrations Existentes e Pendente
- **Problema identificado (Etapa 10.3.1):** Adicionar valores aos ENUMs `notification_type`, `report_target_type` e `audit_action` dentro de bloco `BEGIN ... COMMIT` no PostgreSQL falha (`ALTER TYPE ... ADD VALUE cannot run inside a transaction block`, SQLSTATE `25001`) ou conflita com `20261116114600_research_submissions.sql`.
- **Correção aplicada em [PROPOSED-SOCIAL-MIGRATION.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-10-3-2-phase-a/PROPOSED-SOCIAL-MIGRATION.sql):**
  - Todos os `ALTER TYPE ... ADD VALUE IF NOT EXISTS` (`topic_upvoted`, `topic_mention`, `direct_message`, `user_warning`, `direct_message` em `report_target_type`, ações de moderação/advertência em `audit_action`) foram posicionados no topo do arquivo, **antes** do `BEGIN;`.
  - Aplicado com sucesso no PostgreSQL 18 após todas as 5 migrations existentes (incluindo `20261116114600_research_submissions.sql`).

## AUD-10 — Menções em Tópicos, Limite de 10 e Bloqueios
- **Problema identificado:** Extração ingênua de `@handle` permitiria mention-spam em massa e geração de notificações para usuários bloqueados ou para o próprio autor.
- **Correção aplicada:**
  - Trigger `topics_after_insert_mentions` invoca `public.notify_topic_mentions()`, que extrai handles únicos via regex, aplica `LIMIT 10`, ignora o autor (`recipient_id <> NEW.author_id`), ignora usuários suspensos e respeita `public.is_blocked_between(NEW.author_id, recipient_id)`.
  - Deduplicação natural por usuário dentro do mesmo tópico.

## AUD-11 — Compatibilidade com `on_post_created`, `moderate_topic`, `moderate_post` e `resolve_report`
- **Problema identificado:** A evolução para publicação imediata e moderação pós-publicação não pode quebrar os triggers e RPCs existentes de fórum e denúncias.
- **Correção aplicada:**
  - Nenhum trigger ou assinatura existente de `on_post_created`, `moderate_topic`, `moderate_post` ou `resolve_report` foi removido ou quebrado.
  - Novos campos (`content_status`, `moderation_reason`, `moderated_at`, `moderated_by`, `vote_count`) possuem defaults seguros (`'published'`, `0`), mantendo compatibilidade retroativa com consultas e RPCs da aplicação atual.
  - Mudanças futuras necessárias em TypeScript (`src/types/`, `src/features/forum/`, `src/features/notifications/`, `src/features/reports/`) permanecem separadas para a Fase B, sem alteração em `src/` nesta fase.
