# AUDITORIA DE MENSAGENS PRIVADAS — REVISÃO 3

- `AUD-REV2-01` resolvido: troca simultânea de mensagens na mesma conversa serializa via `FOR NO KEY UPDATE` sem `40P01` e sem regressão temporal (`greatest(last_message_at, now())`).
- `AUD-REV2-02` resolvido: `report_direct_message` exige `dm.status = 'published'::public.content_status`, retornando `P0002` uniforme para ocultas/removidas/inexistentes.
- Todas as garantias anteriores (`is_dm_participant`, `direct_messages_select`, `mark_dm_conversation_read`, `direct_messages_sender_recent_idx`, `reports_dedupe_direct_message_active`, `reported_message_snapshots`) permanecem íntegras.
