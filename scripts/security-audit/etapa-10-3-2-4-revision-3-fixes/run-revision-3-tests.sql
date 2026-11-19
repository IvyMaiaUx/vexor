-- =============================================================================
-- VEXOR — ETAPA 10.3.2.4: TESTES AUD-REV2-02 (report_direct_message + status)
-- =============================================================================
\set ON_ERROR_STOP on

do $$
declare
  v_conv_id   uuid;
  v_msg_pub   uuid;
  v_msg_hid   uuid;
  v_msg_del   uuid;
  v_rep_id    uuid;
  v_snap_cnt  int;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  execute 'set local role authenticated';
  v_conv_id := public.get_or_create_dm_conversation('22222222-2222-2222-2222-222222222222');
  v_msg_pub := public.send_direct_message(v_conv_id, 'DM publicada para denuncia');
  v_msg_hid := public.send_direct_message(v_conv_id, 'DM oculta para teste');
  v_msg_del := public.send_direct_message(v_conv_id, 'DM removida para teste');
  execute 'reset role';

  update public.direct_messages set status = 'hidden'  where id = v_msg_hid;
  update public.direct_messages set status = 'deleted' where id = v_msg_del;

  -- 1. Participante Bob denuncia DM publicada -> permitido
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  execute 'set local role authenticated';
  v_rep_id := public.report_direct_message(v_msg_pub, 'spam', 'Denuncia publicada OK');

  -- 2. DM oculta -> P0002 uniforme
  begin
    perform public.report_direct_message(v_msg_hid, 'spam', 'Tentativa DM oculta');
    raise exception 'AUD-REV2-02 FAILED: DM oculta denunciada';
  exception when sqlstate 'P0002' then null; end;

  -- 3. DM removida -> P0002 uniforme
  begin
    perform public.report_direct_message(v_msg_del, 'spam', 'Tentativa DM removida');
    raise exception 'AUD-REV2-02 FAILED: DM removida denunciada';
  exception when sqlstate 'P0002' then null; end;

  -- 4. Mensagem inexistente -> P0002 uniforme
  begin
    perform public.report_direct_message('99999999-9999-9999-9999-999999999999', 'spam', 'Inexistente');
    raise exception 'AUD-REV2-02 FAILED: DM inexistente aceita';
  exception when sqlstate 'P0002' then null; end;
  execute 'reset role';

  -- 5. Usuário externo Charlie na DM publicada -> 42501
  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  execute 'set local role authenticated';
  begin
    perform public.report_direct_message(v_msg_pub, 'spam', 'Externo tentando denunciar');
    raise exception 'AUD-REV2-02 FAILED: externo denunciou DM';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- 6. Usuário suspenso -> 42501
  perform set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true);
  execute 'set local role authenticated';
  begin
    perform public.report_direct_message(v_msg_pub, 'spam', 'Suspenso tentando denunciar');
    raise exception 'AUD-REV2-02 FAILED: suspenso denunciou DM';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  select count(*) into v_snap_cnt from public.reported_message_snapshots where message_id in (v_msg_hid, v_msg_del);
  if v_snap_cnt <> 0 then
    raise exception 'AUD-REV2-02 FAILED: snapshot órfão criado (%)', v_snap_cnt;
  end if;

  raise notice 'PASS AUD-REV2-02: report_direct_message bloqueia hidden/deleted/inexistente (P0002), externo/suspenso (42501) sem snapshot órfão';
end $$;
