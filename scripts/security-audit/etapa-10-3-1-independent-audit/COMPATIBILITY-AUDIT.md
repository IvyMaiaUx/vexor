# VEXOR — Etapa 10.3.1: Auditoria de Compatibilidade com o Projeto

## 1. Infraestrutura, Framework e Banco
- **Next.js `16.4.6` + `@supabase/ssr` `0.12.7` + `@supabase/supabase-js` `2.119.0`:** 100% compatível com SSR, `src/proxy.ts` (Etapa 10.2) e Supabase Realtime.
- **PostgreSQL `17.11.0.019` remoto:** Compatível com `num_nonnulls()`, `pg_advisory_xact_lock()`, `ALTER TYPE ... ADD VALUE IF NOT EXISTS` (observação: em Postgres, `ALTER TYPE ... ADD VALUE` não pode ser usado na mesma transação que referencie o novo valor em `DEFAULT` ou `CHECK` antes de `COMMIT` — deve ficar fora do bloco ou em statement prévio).

## 2. Incompatibilidades Encontradas nos Contratos Atuais
1. **[MEDIUM] `src/types/database.types.ts` desatualizado para `research` e novos ENUMs:** `notification-service.ts:4-14` já precisou estender manualmente `NotificationType` (`research_approved` | `research_rejected`) porque `database.types.ts` ainda não reflete `20261116114600_research_submissions.sql`. Ao implementar a Etapa 10.3, regenerar `database.types.ts` via `supabase gen types typescript`.
2. **[MEDIUM] `forum-service.ts` (`FORUM_TOPIC_SELECT_COLUMNS` e `FORBIDDEN_TOPIC_MUTATION_KEYS`):**
   - `FORUM_TOPIC_SELECT_COLUMNS` lista explicitamente as colunas atuais de `topics` (`forum-service.ts:23-24`).
   - Adicionar `kind`, `shared_url`, `resource_id`, `vote_count` em `topics` requer atualizar `FORUM_TOPIC_SELECT_COLUMNS`, `FORBIDDEN_TOPIC_MUTATION_KEYS` (incluir `vote_count` como proibido no payload do cliente!) e `ForumTopicItem`.
3. **[MEDIUM] Constraint `reports_one_target` em `reports` (`20261110000001_schema.sql:291`):**
   - Atualmente `check (num_nonnulls(topic_id, post_id, resource_id, profile_id) = 1)` (e `research_id` da migration `20261116114600`). Ao adicionar `message_snapshot_id` em `reports`, será obrigatório dropar e recriar `reports_one_target` incluindo `message_snapshot_id` e criar índice parcial `reports_dedupe_message_snapshot`.
4. **[LOW] Navegação autenticada (`Header` e `Mobile Quick Bar`):**
   - `Header` (`src/components/layout/header.tsx`) atualmente possui 5 itens na `Mobile Quick Bar`: Início (`/`), Catálogo (`/catalog`), Fórum (`/forum`), Contribuir (`/catalog/submit`) e Perfil (`/profile`).
   - A proposta da Etapa 10.3 troca `Contribuir` por `Mensagens` (`/messages`) na barra inferior mobile — o acesso a `Contribuir` (`/catalog/submit`) deve ser mantido no menu/desktop e dentro de `/catalog` para não perder a funcionalidade.
