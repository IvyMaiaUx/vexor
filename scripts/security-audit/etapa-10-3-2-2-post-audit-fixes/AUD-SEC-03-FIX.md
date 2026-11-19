# CORREÇÃO AUD-SEC-03 — VISIBILIDADE DE DMs E `mark_dm_conversation_read`

## Correção Aplicada em `PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql`
1. **Visibilidade (`direct_messages_select`):**
   - Adicionado filtro `and status = 'published'::public.content_status`. Mensagens marcadas como `hidden` ou `deleted` deixam de ser retornadas na leitura normal dos participantes, enquanto `reported_message_snapshots` preserva a evidência intacta e moderadores continuam sem acesso irrestrito a `direct_messages`.
2. **Estado de leitura (`mark_dm_conversation_read(p_conversation_id uuid)`):**
   - Função `SECURITY DEFINER` com `SET search_path = ''` e `EXECUTE` restrito a `authenticated`.
   - Valida `auth.uid()`, `not is_suspended` (`FOR SHARE NOWAIT`) e `public.is_dm_participant(p_conversation_id)` — retornando erro uniforme `42501` (`forbidden`) para não participantes ou conversas inexistentes (sem enumeração).
   - Atualiza exclusivamente `last_read_at = greatest(coalesce(last_read_at, '-infinity'::timestamptz), now())` da linha `(conversation_id, auth.uid())`, mantendo bloqueio de `UPDATE` direto na tabela `direct_conversation_members`.
