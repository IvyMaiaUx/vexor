# VEXOR — Etapa 10.3: Plano de Implementação, Riscos e Testes

## 1. Experiência e Navegação Autenticada (Proposta)
- **Header e Mobile Quick Bar (`user !== null`):**
  1. **Início** (`/`) → **Timeline Social**
  2. **Catálogo** (`/catalog`)
  3. **Fórum** (`/forum`)
  4. **Mensagens** (`/messages`, com badge de não lidas)
  5. **Perfil** (`/profile`)
  - **Notificações** (`NotificationBell` no cabeçalho desktop e mobile, com badge em tempo real).
- **Visitantes (`user === null`):** mantêm integralmente as restrições da Etapa 10.2 (`/` = landing page institucional, sem timeline, sem navbar inferior mobile, `/messages` bloqueado em `src/proxy.ts` redirecionando para `/login?next=%2Fmessages`).

## 2. Sequência de Implementação (Fases)
- **Fase A — Modelagem & Migration Única (Supabase):**
  - Criar migration oficial adicionando `topic_kind`, `topic_votes`, `user_warnings`, `direct_conversations`, `direct_conversation_members`, `direct_messages`, `user_blocks`, `reported_message_snapshots`, extensões em `notifications`/`reports`, triggers, RPCs e RLS.
  - Validar em PostgreSQL local isolado antes de qualquer aplicação remota.
- **Fase B — Timeline Social & Publicação Imediata:**
  - Atualizar `/` autenticado para renderizar o feed social (`timeline-service.ts`, composer, UPs em tópicos, filtros por tipo/categoria) mantendo `/` anônimo intacto.
- **Fase C — Central de Notificações Expandida:**
  - Estender `notification-service.ts` e `NotificationBell` com novos tipos (`topic_upvoted`, `post_upvoted`, `mention`, `direct_message`, `user_warning`, `content_hidden`, `content_removed`) + Realtime.
- **Fase D — Mensagens Privadas (DMs) & Bloqueios:**
  - Criar rota `/messages` (protegida por `src/proxy.ts`), `messages-service.ts`, lista de conversas, chat paginado com Realtime, bloqueio e denúncia com snapshot.
- **Fase E — Painel Admin: Advertências & Snapshot de DMs:**
  - Adicionar ação de advertência (`issue_user_warning` / `revoke_user_warning`) em `/admin/users` e `/admin/reports`, e visualização auditada de `reported_message_snapshots` em `/admin/reports`.

## 3. Plano de Testes
1. **PostgreSQL/RLS Isolado:** testar `topic_votes`, `user_warnings`, `user_blocks` (ambas direções), isolamento de `direct_messages` (3º usuário e admin sem denúncia recebem 0 linhas), snapshot apenas via denúncia, rate-limits e anti-auto-notificação.
2. **Segurança & Proxy:** `/messages` bloqueado para visitantes (Etapa 10.2), zero Open Redirect, zero `service_role` no cliente.
3. **Integração & UI:** fluxo completo de timeline, UP, comentário, notificação, DM + Realtime, bloqueio, denúncia, advertência e auditoria.

## 4. Riscos e Dependências
- **Supabase Realtime + RLS:** exige habilitar as tabelas `direct_messages` e `notifications` na publicação `supabase_realtime` com políticas `SELECT` eficientes (`direct_conversation_members` indexado por `(user_id, conversation_id)`).
- **Spam de toggle em UPs:** mitigado com deduplicação de notificações na trigger.
- **Privacidade em DMs vs. Moderação:** mitigado com `reported_message_snapshots` contendo apenas a mensagem denunciada + acesso auditado.
