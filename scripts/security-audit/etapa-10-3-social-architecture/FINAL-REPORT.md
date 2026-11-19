# VEXOR — Etapa 10.3: Relatório Final de Arquitetura da Comunidade Social

## 1. Inventário do Que Já Existe
- **Banco e Migrations (`20261110000001` a `20261116114600`):** `profiles`, `public_profiles`, `categories`, `resources`, `topics`, `posts`, `tags`, `topic_tags`, `votes`, `bookmarks`, `reports`, `notifications`, `audit_logs`, `research_submissions`, `research_recipients`.
- **Autorização e Segurança:** RLS em todas as tabelas, `requireServerAuthorization`, `src/proxy.ts` protegendo áreas privadas (Etapa 10.2), `getSafeRedirectPath`, `audit_logs` append-only.
- **Serviços:** `forum-service.ts`, `notification-service.ts`, `report-service.ts`, `research-service.ts`, `SupabaseAdminProvider` + handlers em `/api/admin/*` e `/api/research/*`.

## 2. Reaproveitamento vs. Novas Estruturas
- **Reaproveitados:** `topics` + `posts` + `categories` + `tags` + `topic_tags` (base da Timeline sem duplicar tabelas), `votes` (UPs em respostas), `reports` (fila de denúncias), `notifications` (central de notificações), `audit_logs`, `profiles` / `public_profiles`.
- **Novas tabelas propostas:** `topic_votes`, `user_warnings`, `direct_conversations`, `direct_conversation_members`, `direct_messages`, `user_blocks`, `reported_message_snapshots`.
- **Novos ENUMs / extensões:** `topic_kind`, `warning_severity`, `warning_status`; extensão de `notification_type` com 8 eventos sociais/moderação.

## 3. Resumo dos Pilares Arquiteturais
1. **Timeline (`/`)**: para visitantes continua sendo a landing page institucional (Etapa 10.2); para autenticados exibe feed social sobre `topics` estendido (`discussion`, `question`, `tool_share`, `note`) com publicação imediata (`status = 'published'`).
2. **Moderação Posterior & Advertências**: denúncias nunca removem conteúdo automaticamente; moderadores ocultam, restauram ou removem via `moderate_topic`/`moderate_post` e emitem advertências formais em `user_warnings` (distintas de `is_suspended`) com notificação e `audit_logs`.
3. **Mensagens Privadas (`/messages`)**: conversas 1:1 via `direct_conversations` + `direct_conversation_members` + `direct_messages`, bloqueio bilateral em `user_blocks` reforçado por RPC, Realtime com RLS, paginação por cursor e denúncia via `reported_message_snapshots` sem acesso admin irrestrito.
4. **APIs e UI**: Route Handlers/RPCs para DMs, advertências, UPs e timeline; navegação autenticada com `Início (Timeline)`, `Catálogo`, `Fórum`, `Mensagens`, `Perfil` e `Notificações`.

## 4. Parada Obrigatória
Diagnóstico e arquitetura concluídos exclusivamente em documentação (`scripts/security-audit/etapa-10-3-social-architecture/`). Nenhum código da aplicação, migration, banco remoto, conta ou deploy foi alterado nesta etapa. Aguardando aprovação humana antes de iniciar a Fase A.
