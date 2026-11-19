# CORREÇÃO AUD-SEC-01 — DEDUPLICAÇÃO DE DENÚNCIAS DE MENSAGENS PRIVADAS

## Problema Original
`report_direct_message` criava um novo registro em `reported_message_snapshots` com novo UUID a cada chamada antes de inserir em `reports`, tornando ineficaz o índice `reports_dedupe_message_snapshot (reporter_id, message_snapshot_id)`.

## Correção Aplicada em `PROPOSED-SOCIAL-MIGRATION-REVISION-2.sql`
1. Adicionada coluna `message_id uuid` em `public.reports` (sem FK `ON DELETE CASCADE`, preservando integridade caso a DM seja apagada) com constraint `reports_dm_message_id_pair check ((message_snapshot_id is null) = (message_id is null))`.
2. Substituído índice anterior por índice único parcial concorrente:
   ```sql
   create unique index if not exists reports_dedupe_direct_message_active
     on public.reports (reporter_id, message_id)
     where message_id is not null and status in ('open', 'reviewing');
   ```
3. Em `public.report_direct_message(p_message_id, p_reason, p_details)`:
   - Trava a mensagem com `FOR SHARE NOWAIT`.
   - Verifica `exists (... reporter_id = v_caller_id and message_id = v_msg.id and status in ('open', 'reviewing'))` **antes** de criar o snapshot (evitando snapshots órfãos).
   - Se duas transações concorrentes passarem a checagem inicial simultaneamente, `reports_dedupe_direct_message_active` rejeita a segunda com `23505` e faz rollback integral da transação (incluindo o snapshot).
   - Quando a denúncia anterior é `resolved`, novas denúncias voltadas à mesma mensagem voltam a ser aceitas.
