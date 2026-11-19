-- =============================================================================
-- VEXOR — ETAPA 10.3.2.2: TESTES DE SEGURANÇA, RLS, HIERARQUIA E AUD-SEC-01..05
-- Executado exclusivamente em banco temporário local isolado (vexor_etapa10_3_2_2).
-- =============================================================================

\set ON_ERROR_STOP on

-- 1. Seed sintético controlado
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.local',     '{"username":"alice","display_name":"Alice"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.local',       '{"username":"bob","display_name":"Bob"}'),
  ('33333333-3333-3333-3333-333333333333', 'charlie@test.local',   '{"username":"charlie","display_name":"Charlie"}'),
  ('44444444-4444-4444-4444-444444444444', 'mod1@test.local',      '{"username":"mod_one","display_name":"Mod One"}'),
  ('77777777-7777-7777-7777-777777777777', 'mod2@test.local',      '{"username":"mod_two","display_name":"Mod Two"}'),
  ('55555555-5555-5555-5555-555555555555', 'admin@test.local',     '{"username":"admin_user","display_name":"Admin"}'),
  ('66666666-6666-6666-6666-666666666666', 'suspended@test.local', '{"username":"susp_user","display_name":"Suspended"}');

update public.profiles set role = 'moderator' where id in ('44444444-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777');
update public.profiles set role = 'admin'     where id = '55555555-5555-5555-5555-555555555555';
update public.profiles set is_suspended = true where id = '66666666-6666-6666-6666-666666666666';

insert into public.categories (id, slug, name_en, name_pt, scope, sort_order) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'blue-team', 'Blue Team', 'Blue Team', 'both', 10)
on conflict (slug) do nothing;

-- =============================================================================
-- BLOCO 1: AUD-SEC-01 (Deduplicação de report_direct_message sem snapshot órfão)
-- =============================================================================
do $$
declare
  v_conv_id   uuid;
  v_msg_id    uuid;
  v_rep_1     uuid;
  v_rep_2     uuid;
  v_rep_3     uuid;
  v_snap_cnt  int;
  v_rep_cnt   int;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  execute 'set local role authenticated';
  v_conv_id := public.get_or_create_dm_conversation('22222222-2222-2222-2222-222222222222');
  v_msg_id  := public.send_direct_message(v_conv_id, 'Mensagem para testar deduplicação de denúncia');
  execute 'reset role';

  -- Bob envia 1a denúncia -> aceita
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  execute 'set local role authenticated';
  v_rep_1 := public.report_direct_message(v_msg_id, 'spam', 'Primeira denúncia válida');

  -- Bob tenta 2a denúncia enquanto open -> bloqueada (23505), sem snapshot órfão
  begin
    perform public.report_direct_message(v_msg_id, 'spam', 'Segunda denúncia duplicada');
    raise exception 'AUD-SEC-01 FAILED: denúncia duplicada permitida';
  exception when unique_violation then null; end;
  execute 'reset role';

  select count(*) into v_snap_cnt from public.reported_message_snapshots where message_id = v_msg_id;
  if v_snap_cnt <> 1 then
    raise exception 'AUD-SEC-01 FAILED: esperado 1 snapshot, encontrado %', v_snap_cnt;
  end if;

  -- Outro participante (Alice) pode denunciar a mesma mensagem
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  execute 'set local role authenticated';
  v_rep_2 := public.report_direct_message(v_msg_id, 'harassment', 'Denúncia de outro usuário');
  execute 'reset role';

  -- Marca denúncia de Bob como resolved -> permite nova denúncia mantendo histórico
  update public.reports set status = 'resolved' where id = v_rep_1;
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  execute 'set local role authenticated';
  v_rep_3 := public.report_direct_message(v_msg_id, 'spam', 'Nova denúncia após resolução');
  execute 'reset role';

  select count(*) into v_rep_cnt from public.reports where message_id = v_msg_id;
  if v_rep_cnt <> 3 or v_rep_1 = v_rep_3 then
    raise exception 'AUD-SEC-01 FAILED: histórico pós-resolução incorreto (cnt=%)', v_rep_cnt;
  end if;

  raise notice 'PASS AUD-SEC-01: deduplicação ativa (23505), zero snapshot órfão e histórico preservado';
end $$;

-- =============================================================================
-- BLOCO 2: AUD-SEC-02 (Hierarquia admin > moderator > member e anti-auto-revogação)
-- =============================================================================
do $$
declare
  v_w_member uuid;
  v_w_mod1   uuid;
  v_audit_cnt int;
  v_notif_cnt int;
begin
  -- Mod1 adverte membro Alice -> OK
  perform set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  execute 'set local role authenticated';
  v_w_member := public.issue_user_warning('11111111-1111-1111-1111-111111111111', 'spam', 'low', 'Advertência de moderador em membro');

  -- Mod1 tenta advertir Mod2 -> 42501
  begin
    perform public.issue_user_warning('77777777-7777-7777-7777-777777777777', 'spam', 'low', 'Mod tentando advertir outro mod');
    raise exception 'AUD-SEC-02 FAILED: moderador advertiu outro moderador';
  exception when insufficient_privilege then null; end;

  -- Mod1 tenta advertir Admin -> 42501
  begin
    perform public.issue_user_warning('55555555-5555-5555-5555-555555555555', 'spam', 'low', 'Mod tentando advertir admin');
    raise exception 'AUD-SEC-02 FAILED: moderador advertiu admin';
  exception when insufficient_privilege then null; end;

  -- Auto-advertência -> 42501
  begin
    perform public.issue_user_warning('44444444-4444-4444-4444-444444444444', 'spam', 'low', 'Tentativa de auto-advertência');
    raise exception 'AUD-SEC-02 FAILED: auto-advertência permitida';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- Admin adverte Mod1 -> OK
  perform set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);
  execute 'set local role authenticated';
  v_w_mod1 := public.issue_user_warning('44444444-4444-4444-4444-444444444444', 'harassment', 'medium', 'Admin advertindo moderador');
  execute 'reset role';

  -- Mod1 tenta auto-revogar própria advertência -> 42501
  perform set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  execute 'set local role authenticated';
  begin
    perform public.revoke_user_warning(v_w_mod1, 'Tentando auto-revogar');
    raise exception 'AUD-SEC-02 FAILED: auto-revogação permitida';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- Mod2 tenta revogar advertência de Mod1 -> 42501
  perform set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', true);
  execute 'set local role authenticated';
  begin
    perform public.revoke_user_warning(v_w_mod1, 'Mod2 tentando revogar mod1');
    raise exception 'AUD-SEC-02 FAILED: mod2 revogou advertência de mod1';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- Admin revoga advertência de Mod1 -> OK
  perform set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);
  execute 'set local role authenticated';
  perform public.revoke_user_warning(v_w_mod1, 'Revogação administrativa válida');
  execute 'reset role';

  -- Usuário suspenso tenta emitir advertência -> 42501
  perform set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true);
  execute 'set local role authenticated';
  begin
    perform public.issue_user_warning('11111111-1111-1111-1111-111111111111', 'spam', 'low', 'Suspenso tentando advertir');
    raise exception 'AUD-SEC-02 FAILED: usuário suspenso advertiu';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  select count(*) into v_audit_cnt from public.audit_logs where action in ('warning.issued', 'warning.revoked');
  select count(*) into v_notif_cnt from public.notifications where type = 'user_warning';
  if v_audit_cnt < 3 or v_notif_cnt < 2 then
    raise exception 'AUD-SEC-02 FAILED: audit_cnt=%, notif_cnt=%', v_audit_cnt, v_notif_cnt;
  end if;

  raise notice 'PASS AUD-SEC-02: hierarquia admin>mod>member, anti-auto-revogação e auditoria OK';
end $$;

-- =============================================================================
-- BLOCO 3: AUD-SEC-03 & AUD-SEC-05 (Visibilidade DM, last_read_at, imutabilidade snapshot)
-- =============================================================================
do $$
declare
  v_conv_id   uuid;
  v_msg_id    uuid;
  v_read_at   timestamptz;
  v_vis_cnt   int;
  v_bob_read  timestamptz;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  execute 'set local role authenticated';
  v_conv_id := public.get_or_create_dm_conversation('22222222-2222-2222-2222-222222222222');
  v_msg_id  := public.send_direct_message(v_conv_id, 'Mensagem que será ocultada');

  -- Alice atualiza próprio last_read_at via RPC
  v_read_at := public.mark_dm_conversation_read(v_conv_id);
  if v_read_at is null then
    raise exception 'AUD-SEC-03 FAILED: last_read_at nulo';
  end if;

  -- Tentativa direta de UPDATE em direct_conversation_members -> 42501
  begin
    update public.direct_conversation_members set last_read_at = now() where conversation_id = v_conv_id;
    raise exception 'AUD-SEC-03 FAILED: UPDATE direto em direct_conversation_members permitido';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- Verifica que last_read_at de Bob não foi alterado por Alice
  select last_read_at into v_bob_read from public.direct_conversation_members where conversation_id = v_conv_id and user_id = '22222222-2222-2222-2222-222222222222';
  if v_bob_read is not null then
    raise exception 'AUD-SEC-03 FAILED: estado de leitura de Bob alterado';
  end if;

  -- Charlie (não participante) tenta mark_dm_conversation_read -> 42501
  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  execute 'set local role authenticated';
  begin
    perform public.mark_dm_conversation_read(v_conv_id);
    raise exception 'AUD-SEC-03 FAILED: terceiro marcou leitura';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- Suspenso tenta mark_dm_conversation_read -> 42501
  perform set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true);
  execute 'set local role authenticated';
  begin
    perform public.mark_dm_conversation_read(v_conv_id);
    raise exception 'AUD-SEC-03 FAILED: suspenso marcou leitura';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- Oculta a DM -> participantes não a veem na leitura normal
  update public.direct_messages set status = 'hidden' where id = v_msg_id;
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  execute 'set local role authenticated';
  select count(*) into v_vis_cnt from public.direct_messages where id = v_msg_id;
  if v_vis_cnt <> 0 then
    raise exception 'AUD-SEC-03 FAILED: DM oculta ainda visível';
  end if;
  execute 'reset role';

  -- AUD-SEC-05: Tentativa de UPDATE e DELETE em reported_message_snapshots como moderator -> 42501
  perform set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  execute 'set local role authenticated';
  begin
    update public.reported_message_snapshots set body_snapshot = 'adulterado';
    raise exception 'AUD-SEC-05 FAILED: UPDATE em snapshot permitido';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.reported_message_snapshots;
    raise exception 'AUD-SEC-05 FAILED: DELETE em snapshot permitido';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  raise notice 'PASS AUD-SEC-03 & AUD-SEC-05: visibilidade, mark_dm_conversation_read e imutabilidade de snapshots OK';
end $$;

-- =============================================================================
-- BLOCO 4: AUD-SEC-04 (Índice direct_messages_sender_recent_idx e rate limit 30/min)
-- =============================================================================
do $$
declare
  v_conv_id uuid;
  v_idx_ok  boolean;
  i         int;
begin
  select exists (
    select 1 from pg_indexes
     where schemaname = 'public'
       and tablename = 'direct_messages'
       and indexname = 'direct_messages_sender_recent_idx'
  ) into v_idx_ok;
  if not v_idx_ok then
    raise exception 'AUD-SEC-04 FAILED: índice direct_messages_sender_recent_idx ausente';
  end if;

  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  execute 'set local role authenticated';
  v_conv_id := public.get_or_create_dm_conversation('22222222-2222-2222-2222-222222222222');

  for i in 1..30 loop
    perform public.send_direct_message(v_conv_id, 'Rate limit msg ' || i);
  end loop;

  begin
    perform public.send_direct_message(v_conv_id, 'Rate limit msg 31');
    raise exception 'AUD-SEC-04 FAILED: 31a DM no minuto permitida';
  exception when sqlstate '42901' then null; end;
  execute 'reset role';

  raise notice 'PASS AUD-SEC-04: índice verificado e rate limit 30/min (42901) OK';
end $$;
