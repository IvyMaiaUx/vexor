# CORREÇÕES AUD-05 A AUD-08

## AUD-05 — Preservação de Evidências e Retenção em Denúncias de DMs
- **Problema identificado (Etapa 10.3.1):** Denunciar uma mensagem privada sem snapshot imutável permitiria que o autor editasse/apagasse ou perdesse contexto antes da análise pela moderação; inversamente, liberar leitura ampla de `direct_messages` para admins violaria privacidade.
- **Correção aplicada em [PROPOSED-SOCIAL-MIGRATION.sql](file:///c:/Users/Ivy%20Maia/Desktop/cybersec-community-platform/scripts/security-audit/etapa-10-3-2-phase-a/PROPOSED-SOCIAL-MIGRATION.sql):**
  - Criada `public.dm_report_snapshots` (`report_id`, `message_id`, `conversation_id`, `sender_id`, `body_snapshot`, `message_created_at`, `captured_at`).
  - RPC `public.report_direct_message(p_message_id uuid, p_reason text)` valida participação na conversa, cria o `report` (`target_type = 'direct_message'`) e grava snapshot imutável em `dm_report_snapshots`.
  - Policies `append-only` em `dm_report_snapshots`: somente moderadores/admins ativos podem ler snapshots denunciados, sem acesso às demais mensagens da conversa; `UPDATE` e `DELETE` negados.

## AUD-06 — Validação de `topics.title` (`NOT NULL`, `5..200`)
- **Problema identificado:** A timeline social não pode aceitar títulos vazios, nulos, só com espaços ou acima de 200 caracteres sem romper compatibilidade com o schema base (`topics_title_length`).
- **Correção aplicada:**
  - Mantida integridade de `public.topics.title` (`NOT NULL` e constraint `char_length(btrim(title)) BETWEEN 5 AND 200`).
  - Validado em testes locais que `NULL`, `< 5` chars e `> 200` chars são rejeitados (`23502` / `23514`), enquanto exatamente 5 e exatamente 200 caracteres são aceitos.

## AUD-07 — Paginação por Cursor Composto `(created_at, id)`
- **Problema identificado:** Paginação baseada apenas em `created_at` ou `OFFSET` sofre duplicação ou perda de itens quando dois tópicos compartilham exatamente o mesmo timestamp.
- **Correção aplicada:**
  - Índice composto `idx_topics_timeline_cursor ON public.topics (created_at DESC, id DESC) WHERE content_status = 'published'`.
  - Consultas keyset usando `(created_at, id) < ($cursor_ts, $cursor_id) ORDER BY created_at DESC, id DESC`.
  - Comprovado em teste local com 5 tópicos de `created_at` idêntico paginados de 2 em 2 (páginas `2 + 2 + 1 = 5` distintos, zero duplicação/perda).

## AUD-08 — Bloqueio Bilateral e Idempotência em DMs
- **Problema identificado:** Race condition ao abrir DM simultânea entre dois usuários e necessidade de bloqueio bilateral (ninguém pode enviar DM ou contornar bloqueio em nenhuma direção).
- **Correção aplicada:**
  - `public.user_blocks (blocker_id, blocked_id, created_at)` com PK composta e constraint `blocker_id <> blocked_id`.
  - Função `public.is_blocked_between(uuid, uuid)` usada em `get_or_create_dm_conversation` e nas policies/RPCs de `direct_messages`.
  - `direct_conversations.pair_key` (`UNIQUE`) + advisory lock ordenado `pg_advisory_xact_lock` garante idempotência mesmo sob chamadas concorrentes simultâneas.
