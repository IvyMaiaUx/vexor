# CORREÇÃO AUD-SEC-04 — ÍNDICE DE RATE LIMIT EM `direct_messages`

## Correção Aplicada em `PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql`
1. Criado índice parcial dedicado:
   ```sql
   create index if not exists direct_messages_sender_recent_idx
     on public.direct_messages (sender_id, created_at desc)
     where sender_id is not null;
   ```
   - O predicado parcial `where sender_id is not null` exclui mensagens órfãs de contas removidas, mantendo o índice enxuto.
   - Alinha-se exatamente ao filtro e ordenação da consulta de rate limit (`where dm.sender_id = v_caller_id and dm.created_at > now() - interval '1 minute'`).
2. Adicionado `pg_advisory_xact_lock(hashtextextended('dm_rate:' || v_caller_id::text, 0))` em `send_direct_message` para serializar rajadas concorrentes do mesmo remetente.
3. **Evidência `EXPLAIN (ANALYZE, BUFFERS)` local:**
   `Index Only Scan using direct_messages_sender_recent_idx on direct_messages dm` (`Execution Time: 0.715 ms`, `Buffers: shared hit=2` para 30 mensagens no minuto).
