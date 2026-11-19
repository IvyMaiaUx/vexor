# CORREÇÃO AUD-REV2-02 — FILTRO DE STATUS EM `report_direct_message`

## Correção Aplicada
Em `public.report_direct_message`, a consulta inicial da mensagem foi atualizada para:
```sql
select dm.id, dm.conversation_id, dm.sender_id, dm.body, dm.created_at
  into v_msg
  from public.direct_messages dm
 where dm.id = p_message_id
   and dm.status = 'published'::public.content_status
   for share nowait;
```

## SQLSTATEs Esperados e Validados
| Cenário | SQLSTATE | Snapshot criado? |
|---|---|---|
| Participante denuncia DM `published` | Sucesso (`uuid` retornado) | Sim (1) |
| DM `hidden` | `P0002` (`message not found`) | Não (`0`) |
| DM `deleted` | `P0002` (`message not found`) | Não (`0`) |
| DM inexistente | `P0002` (`message not found`) | Não (`0`) |
| Usuário externo na DM `published` | `42501` (`forbidden`) | Não (`0`) |
| Usuário suspenso | `42501` (`forbidden`) | Não (`0`) |
| Denúncia duplicada ativa | `23505` (`duplicate active report`) | Não (rollback) |
