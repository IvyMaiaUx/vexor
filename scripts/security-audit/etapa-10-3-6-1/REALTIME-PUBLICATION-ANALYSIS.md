# ANÁLISE DA PUBLICAÇÃO `supabase_realtime` — ETAPA 10.3.6.1

## 1. Implementação Idempotente (`POST-02`)
A migration `20261118183000_social_permissions_realtime.sql` verifica:
1. Se `supabase_realtime` existe em `pg_catalog.pg_publication`.
2. Individualmente em `pg_catalog.pg_publication_tables`, se `public.direct_messages` e `public.notifications` já são membros; caso contrário, executa `ALTER PUBLICATION supabase_realtime ADD TABLE ...`.
3. Não remove tabelas existentes nem altera outras publicações ou policies RLS.

## 2. `REPLICA IDENTITY` e Segurança
- **Decisão:** Mantido `REPLICA IDENTITY DEFAULT` (Primary Key `id` em `direct_messages` e `notifications`). `REPLICA IDENTITY FULL` não é necessário para assinaturas `INSERT` e aumentaria o volume de WAL no plano Supabase Free.
- **Segurança:** A publicação não concede acesso por si só; a entrega de eventos no Supabase Realtime continua condicionada às policies `SELECT` (`direct_messages_select` exigindo `is_active_member()`, `is_dm_participant(conversation_id)` e `status = 'published'`; `notifications` exigindo `user_id = auth.uid()`).
- **Limitação:** Testes WebSocket reais dependem do servidor Realtime do Supabase (não disponível em `psql` local isolado).
