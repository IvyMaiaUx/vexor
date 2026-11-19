# VEXOR — ETAPA 10.3.2 (FASE A): ARQUITETURA SOCIAL CORRIGIDA

## 1. Visão Geral

Esta arquitetura consolida todas as correções aplicadas aos 11 achados (`AUD-01` a `AUD-11`) identificados na auditoria independente da Etapa 10.3.1, mantendo compatibilidade estrita com as 4 migrations oficiais já aplicadas e com a migration `20261116114600_research_submissions.sql`.

- **Artefato SQL experimental:** [PROPOSED-SOCIAL-MIGRATION.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-10-3-2-phase-a/PROPOSED-SOCIAL-MIGRATION.sql)
- **SHA-256:** `35031D14AACE6B27E5568C0339266ABB9A1821C9C10B26D1E96642EA382E496B`
- **Escopo:** Somente proposta experimental e validação em PostgreSQL 18 local isolado. Nenhuma alteração foi feita no banco remoto (`zcjudcbckcxwnfnrjfte`) nem em arquivos de produção (`src/*` ou `supabase/migrations/*`).

## 2. Pilares Corrigidos

### 2.1 Timeline e Publicação Imediata (`AUD-02`, `AUD-03`, `AUD-06`, `AUD-07`)
- **Publicação imediata:** `public.topics` e `public.posts` passam a suportar publicação imediata com visibilidade controlada por `content_status` (`published`, `hidden`, `removed`, `pending_review`) e `moderation_reason`.
- **Bloqueio de `anon`:** Revogado `SELECT` direto de `anon` em `topics`, `posts`, `resources`, `categories`, `tags` e `topic_tags` (`AUD-02`), preservando `authenticated` e mantendo a landing page pública via rotas/views institucionais seguras sem expor dados internos de membros.
- **Votos em tópicos (`topic_votes`):** Tabela dedicada `public.topic_votes` com trigger `on_topic_vote_changed` e RPC atômica `public.toggle_topic_vote(uuid)` usando `FOR UPDATE NOWAIT` (`55P03`) para manter `topics.vote_count` consistente sob concorrência (`AUD-03`).
- **Validação de título e paginação (`AUD-06`, `AUD-07`):** `topics.title` validado com `NOT NULL` e `char_length(trim(title)) BETWEEN 5 AND 200`; paginação por cursor composto `(created_at DESC, id DESC)` com índice dedicado `idx_topics_timeline_cursor`.

### 2.2 Mensagens Privadas e Segurança (`AUD-01`, `AUD-05`, `AUD-08`)
- **Anti-recursão RLS (`AUD-01`):** Função auxiliar `public.is_dm_participant(uuid)` (`SECURITY DEFINER`, `STABLE`, `SET search_path = ''`, identidade estritamente via `auth.uid()`).
- **Conversas 1:1 determinísticas:** `public.direct_conversations` com coluna normalizada `pair_key` (`least(u1, u2)::text || ':' || greatest(u1, u2)::text`) e RPC `public.get_or_create_dm_conversation(uuid)` com advisory lock no par ordenado para criação idempotente sem race condition.
- **Bloqueio bilateral (`AUD-08`):** `public.user_blocks` e função `public.is_blocked_between(uuid, uuid)` impedem envio de mensagens, criação de DMs e geração de notificações por menção entre usuários bloqueados em qualquer direção.
- **Preservação de evidências (`AUD-05`):** Denúncias de mensagens privadas gravam snapshot imutável em `public.dm_report_snapshots` (`append-only` para moderadores/admins com auditoria obrigatória), sem expor acesso irrestrito às conversas privadas.

### 2.3 Advertências e Moderação (`AUD-04`, `AUD-09`, `AUD-11`)
- **Advertências (`public.user_warnings`):** Separadas de suspensão (`profiles.status`), com `dedupe_key` único para evitar duplicação, justificativa obrigatória (`reason`, `description`), referência opcional a `topic`/`post`/`dm` e revogação auditável via `revoke_user_warning(uuid, text)` (`AUD-04`).
- **Hierarquia:** Moderador não pode advertir nem revogar advertência de outro moderador ou administrador; administrador pode atuar sobre membros e moderadores (exceto auto-advertência ou violação de último admin).
- **Compatibilidade (`AUD-09`, `AUD-11`):** Enums existentes (`notification_type`, `report_target_type`, `audit_action`) estendidos de forma idempotente fora de transação (`ALTER TYPE ... ADD VALUE IF NOT EXISTS`), preservando `on_post_created`, `moderate_topic`, `moderate_post` e `resolve_report`.

### 2.4 Notificações e Menções (`AUD-10`)
- **Prevenção de auto-notificação e deduplicação:** `notify_topic_vote` e `notify_dm_message` ignoram auto-ações (`actor_id = recipient_id`) e respeitam bloqueios bilaterais.
- **Menções em tópicos (`AUD-10`):** Trigger `topics_after_insert_mentions` extrai `@handles` únicos com limite máximo de 10 destinatários por tópico, ignora autor e usuários bloqueados via `user_blocks`, evitando spam e enumeração.
