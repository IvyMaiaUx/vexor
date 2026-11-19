# VEXOR — Etapa 10.3: Políticas RLS, Segurança e Proteção Contra Abuso

## 1. Políticas RLS Propostas

### `topic_votes`
- `SELECT`: `is_active_member()` (ou `user_id = auth.uid()` para checagem própria; contagem agregada vem de `topics.vote_count`).
- `INSERT`: `is_active_member() AND user_id = auth.uid()` + `topics.status = 'published'`.
- `DELETE`: `is_active_member() AND user_id = auth.uid()`.

### `user_warnings`
- `SELECT`: `user_id = auth.uid() OR is_moderator()`.
- `INSERT` / `UPDATE` / `DELETE`: negado diretamente a clientes; mutações exclusivas via RPCs `SECURITY DEFINER` (`issue_user_warning`, `acknowledge_user_warning`, `revoke_user_warning`).

### `direct_conversations` e `direct_conversation_members`
- `SELECT`: apenas onde `exists (select 1 from public.direct_conversation_members m where m.conversation_id = id and m.user_id = auth.uid())`.
- `INSERT` / `UPDATE` / `DELETE`: bloqueado diretamente; criação apenas via `get_or_create_dm_conversation()` e leitura marcada via `mark_dm_conversation_read()`.

### `direct_messages`
- `SELECT`: apenas participantes da conversa (`exists ... direct_conversation_members`). **Sem** política de acesso irrestrito para `admin` ou `moderator`.
- `INSERT` / `UPDATE` / `DELETE`: bloqueado diretamente; envio exclusivamente via `send_direct_message()` (que checa `user_blocks` nas duas direções e `is_active_member()`).

### `user_blocks`
- `SELECT`: `blocker_id = auth.uid()`. (Não expor ao bloqueado quem o bloqueou via `SELECT` direto.)
- `INSERT`: `is_active_member() AND blocker_id = auth.uid() AND blocked_id <> auth.uid()`.
- `DELETE`: `blocker_id = auth.uid()`.

### `reported_message_snapshots`
- `SELECT`: apenas `is_moderator()`, quando vinculado a um `report` existente (recomendado exigir RPC `get_reported_message_evidence(p_report_id)` para gravar visualização em `audit_logs`).
- `INSERT` / `UPDATE` / `DELETE`: exclusivamente via `report_direct_message()` (`SECURITY DEFINER`).

## 2. Proteção Contra Abuso (Sem Bloquear Conteúdo Técnico Legítimo)
1. **Rate limit em banco (triggers/RPCs) + Route Handlers:**
   - Publicações (`topics`): ex. máx. 5 publicações / 10 min por usuário (permite uso normal, trava flood).
   - Comentários (`posts`): ex. máx. 15 comentários / 5 min por usuário.
   - Mensagens privadas (`send_direct_message`): ex. máx. 30 mensagens / 1 min e bloqueio de duplicata idêntica consecutiva em < 5s.
   - UPs (`votes` / `topic_votes`): chave primária impede voto múltiplo; janela anti-duplicação em `notifications` neutraliza spam de toggle UP/un-UP.
2. **Validação de links, arquivos e tamanhos:**
   - Manter `topics.body` até `20.000` chars (suporta write-ups técnicos), `posts.body` até `10.000`, `direct_messages.body` até `4.000`.
   - Links compartilhados validados com `https?://` e sanitização XSS na renderização (`MarkdownView` / `sanitize.ts`), nunca bloqueando snippets de código/IoCs em blocos Markdown.
3. **Sem `service_role` no frontend:** toda autorização permanece baseada em Supabase SSR + JWT + `auth.uid()` + RLS.
