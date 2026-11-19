# VEXOR — Etapa 10.3.1: Auditoria de RLS, GRANTs, `SECURITY DEFINER` e Concorrência

## 1. Padrões Obrigatórios da Base Atual (`20261110000003` + `20261113143000`)
Qualquer nova função, tabela ou policy deve seguir integralmente os padrões já consolidados na Vexor:
- `REVOKE ALL` baseline em todas as tabelas novas para `anon` e `authenticated`; apenas `GRANT SELECT` e `GRANT INSERT/UPDATE (colunas)` estritamente necessários.
- Toda função `SECURITY DEFINER` com `SET search_path = ''`, `REVOKE ALL FROM public, anon` e `GRANT EXECUTE TO authenticated` (ou `REVOKE` total se for função de trigger).
- Revalidação pós-lock (`FOR SHARE NOWAIT` no chamador / `FOR UPDATE NOWAIT` no alvo) para RPCs administrativas e de advertência.

## 2. Achados de RLS, GRANTs e Concorrência
1. **[HIGH] Exposição de `topics`, `posts`, `resources` para `anon` no Postgres:** Em `20261110000003_rls_and_grants.sql:79-81`, `anon` ainda possui `GRANT SELECT`. Embora o Next.js (`src/proxy.ts` da Etapa 10.2) bloqueie visitantes nas rotas web, o endpoint REST do Supabase continua acessível via `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`anon`). **Correção:** na migration social, executar `REVOKE SELECT ON public.topics, public.posts, public.resources, public.topic_tags FROM anon;` e restringir as policies de leitura dessas tabelas para `to authenticated`.
2. **[CRITICAL] Recursão de RLS em `direct_conversation_members`:** Conforme detalhado em `MESSAGING-SECURITY-AUDIT.md`, usar `is_dm_participant(conversation_id)` `SECURITY DEFINER`.
3. **[HIGH] Revalidação pós-lock ausente nas RPCs propostas:** `issue_user_warning`, `revoke_user_warning`, `send_direct_message` e `report_direct_message` precisam validar `is_active_member()` / `is_moderator()` **após** o lock de linha (para evitar TOCTOU caso o usuário seja suspenso ou rebaixado concorrentemente).
4. **[MEDIUM] Ordem determinística de locks em `user_blocks` e `direct_conversations`:** Para evitar deadlocks entre dois usuários criando conversa ou bloqueando simultaneamente, ordenar sempre os UUIDs (`least(u1, u2)`, `greatest(u1, u2)`) ao adquirir advisory locks ou locks de linha em pares de usuários.
5. **[MEDIUM] Usuário suspenso ainda com sessão Realtime aberta:** Caso um usuário seja suspenso com WebSocket Realtime conectado, `is_active_member()` na policy `SELECT` de `direct_messages` (ou verificação na camada de entrega) garante que novas mensagens/eventos não sejam entregues após suspensão.
