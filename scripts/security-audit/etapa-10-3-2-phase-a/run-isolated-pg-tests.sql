-- =============================================================================
-- VEXOR — ETAPA 10.3.2 (FASE A): TESTES REAIS DE SCHEMA, RLS, CONCORRÊNCIA E AUD-01..10
-- Executado exclusivamente em banco temporário local isolado (vexor_etapa10_3_2).
-- =============================================================================

\set ON_ERROR_STOP on

-- 1. Seed sintético controlado (usuários fictícios)
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.local',     '{"username":"alice","display_name":"Alice"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.local',       '{"username":"bob","display_name":"Bob"}'),
  ('33333333-3333-3333-3333-333333333333', 'charlie@test.local',   '{"username":"charlie","display_name":"Charlie"}'),
  ('44444444-4444-4444-4444-444444444444', 'mod@test.local',       '{"username":"mod_user","display_name":"Moderator"}'),
  ('55555555-5555-5555-5555-555555555555', 'admin@test.local',     '{"username":"admin_user","display_name":"Admin"}'),
  ('66666666-6666-6666-6666-666666666666', 'suspended@test.local', '{"username":"susp_user","display_name":"Suspended"}');

update public.profiles set role = 'moderator' where id = '44444444-4444-4444-4444-444444444444';
update public.profiles set role = 'admin'     where id = '55555555-5555-5555-5555-555555555555';
update public.profiles set is_suspended = true where id = '66666666-6666-6666-6666-666666666666';

insert into public.categories (id, slug, name_en, name_pt, scope, sort_order) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'blue-team', 'Blue Team', 'Blue Team', 'both', 10)
on conflict (slug) do nothing;

-- =============================================================================
-- BLOCO 1: AUD-02 (anon revogado em tabelas internas; authenticated permitido)
-- =============================================================================
do $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  execute 'set local role anon';
  begin
    perform 1 from public.topics limit 1;
    raise exception 'AUD-02 FAILED: anon deveria ser bloqueado em public.topics';
  exception when insufficient_privilege then
    null; -- esperado: 42501
  end;
  begin
    perform 1 from public.posts limit 1;
    raise exception 'AUD-02 FAILED: anon deveria ser bloqueado em public.posts';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform 1 from public.resources limit 1;
    raise exception 'AUD-02 FAILED: anon deveria ser bloqueado em public.resources';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';
  raise notice 'PASS AUD-02: anon bloqueado (42501) em topics, posts e resources';
end $$;

-- =============================================================================
-- BLOCO 2: AUD-06 (topics.title NOT NULL e 5..200 chars) + AUD-07 (cursor composto)
-- =============================================================================
do $$
declare
  v_same_ts timestamptz := '2026-11-17T12:00:00Z';
  v_p1_cnt  int;
  v_p2_cnt  int;
  v_p3_cnt  int;
  v_last_ts timestamptz;
  v_last_id uuid;
  v_distinct_total int;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';

  -- NULL / vazio / <5 / >200 devem falhar
  begin
    insert into public.topics (category_id, title, body) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'Body valido com mais de 10 chars');
    raise exception 'AUD-06 FAILED: title NULL aceito';
  exception when not_null_violation then null; end;

  begin
    insert into public.topics (category_id, title, body) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'abcd', 'Body valido com mais de 10 chars');
    raise exception 'AUD-06 FAILED: title < 5 aceito';
  exception when check_violation then null; end;

  begin
    insert into public.topics (category_id, title, body) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', repeat('x', 201), 'Body valido com mais de 10 chars');
    raise exception 'AUD-06 FAILED: title > 200 aceito';
  exception when check_violation then null; end;

  -- Exatamente 5 e exatamente 200 devem passar (respeitando GRANT INSERT (category_id, title, body) para authenticated)
  insert into public.topics (category_id, title, body) values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'abcde', 'Body valido com mais de 10 chars'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', repeat('y', 200), 'Body valido com mais de 10 chars'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Timeline item 3', 'Body valido com mais de 10 chars'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Timeline item 4', 'Body valido com mais de 10 chars'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Timeline item 5', 'Body valido com mais de 10 chars');

  -- Ajusta created_at apenas como superuser para simular empate exato de timestamp na paginação
  execute 'reset role';
  update public.topics set created_at = v_same_ts where author_id = '11111111-1111-1111-1111-111111111111';
  execute 'set local role authenticated';

  -- AUD-07: paginação keyset (created_at, id) com timestamps idênticos
  create temp table _pg_seen (id uuid) on commit drop;
  insert into _pg_seen
  select id from public.topics where created_at = v_same_ts order by created_at desc, id desc limit 2;
  get diagnostics v_p1_cnt = row_count;
  select created_at, id into v_last_ts, v_last_id from public.topics where id in (select id from _pg_seen) order by created_at asc, id asc limit 1;

  insert into _pg_seen
  select id from public.topics where created_at = v_same_ts and (created_at, id) < (v_last_ts, v_last_id) order by created_at desc, id desc limit 2;
  get diagnostics v_p2_cnt = row_count;
  select created_at, id into v_last_ts, v_last_id from public.topics where id in (select id from _pg_seen) order by created_at asc, id asc limit 1;

  insert into _pg_seen
  select id from public.topics where created_at = v_same_ts and (created_at, id) < (v_last_ts, v_last_id) order by created_at desc, id desc limit 2;
  get diagnostics v_p3_cnt = row_count;

  select count(distinct id) into v_distinct_total from _pg_seen;
  if v_p1_cnt <> 2 or v_p2_cnt <> 2 or v_p3_cnt <> 1 or v_distinct_total <> 5 then
    raise exception 'AUD-07 FAILED: p1=%, p2=%, p3=%, distinct=%', v_p1_cnt, v_p2_cnt, v_p3_cnt, v_distinct_total;
  end if;

  execute 'reset role';
  raise notice 'PASS AUD-06 & AUD-07: title 5..200 validado e keyset (created_at, id) sem duplicação/perda';
end $$;

-- =============================================================================
-- BLOCO 3: AUD-03 (UPs em topics/posts, toggle sem rollback e sem auto-notificação)
-- =============================================================================
do $$
declare
  v_topic_id uuid;
  v_votes    int;
  v_notif_cnt int;
begin
  select id into v_topic_id from public.topics where title = 'Timeline item 3' limit 1;

  -- Bob dá UP -> vote_count = 1, notif = 1
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  execute 'set local role authenticated';
  insert into public.topic_votes (topic_id) values (v_topic_id);
  delete from public.topic_votes where topic_id = v_topic_id and user_id = '22222222-2222-2222-2222-222222222222';
  -- Segundo UP na janela de 24h -> vote_count volta para 1 e notificação não duplica nem dá rollback!
  insert into public.topic_votes (topic_id) values (v_topic_id);

  -- Alice (autora) dá UP em si mesma -> vote_count = 2, mas 0 auto-notificações
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  execute 'set local role authenticated';
  insert into public.topic_votes (topic_id) values (v_topic_id);
  execute 'reset role';

  select vote_count into v_votes from public.topics where id = v_topic_id;
  select count(*) into v_notif_cnt from public.notifications where topic_id = v_topic_id and type = 'topic_upvoted';
  if v_votes <> 2 or v_notif_cnt <> 1 then
    raise exception 'AUD-03 FAILED: vote_count=%, notif_cnt=%', v_votes, v_notif_cnt;
  end if;
  raise notice 'PASS AUD-03: toggle UP/un-UP consistente (vote_count=2, notif=1, zero auto-notificação)';
end $$;

-- =============================================================================
-- BLOCO 4: AUD-01, AUD-05 e Bloqueio Bilateral em DMs
-- =============================================================================
do $$
declare
  v_conv_id   uuid;
  v_msg_id    uuid;
  v_report_id uuid;
  v_ext_cnt   int;
  v_snap_body text;
begin
  -- Alice cria conversa e envia mensagem para Bob
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  execute 'set local role authenticated';
  v_conv_id := public.get_or_create_dm_conversation('22222222-2222-2222-2222-222222222222');
  v_msg_id  := public.send_direct_message(v_conv_id, 'Mensagem confidencial de teste DM');

  -- Charlie (externo) não pode ver conversa nem mensagens (sem recursão 42P17)
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  execute 'set local role authenticated';
  select count(*) into v_ext_cnt from public.direct_messages where conversation_id = v_conv_id;
  if v_ext_cnt <> 0 then
    raise exception 'AUD-01 FAILED: usuário externo leu % mensagens', v_ext_cnt;
  end if;

  -- Bob denuncia a mensagem -> snapshot criado
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  execute 'set local role authenticated';
  v_report_id := public.report_direct_message(v_msg_id, 'harassment', 'Teste de preservação de evidência');
  execute 'reset role';

  -- Mensagem original é apagada -> evidência DEVE continuar preservada (AUD-05)
  delete from public.direct_messages where id = v_msg_id;

  -- Moderador lê evidência via RPC auditada
  perform set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  execute 'set local role authenticated';
  select body_snapshot into v_snap_body from public.get_reported_message_evidence(v_report_id);
  if v_snap_body <> 'Mensagem confidencial de teste DM' then
    raise exception 'AUD-05 FAILED: snapshot perdido após exclusão da DM';
  end if;
  execute 'reset role';

  -- Charlie bloqueia Alice -> DM bloqueada bilateralmente
  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  execute 'set local role authenticated';
  insert into public.user_blocks (blocked_id) values ('11111111-1111-1111-1111-111111111111');
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  execute 'set local role authenticated';
  begin
    perform public.get_or_create_dm_conversation('33333333-3333-3333-3333-333333333333');
    raise exception 'Bloqueio bilateral FAILED: Alice conseguiu abrir DM com Charlie';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  raise notice 'PASS AUD-01 & AUD-05: DMs isoladas sem 42P17, snapshot imutável preservado e bloqueio bilateral ativo';
end $$;

-- =============================================================================
-- BLOCO 5: AUD-04 (hierarquia mod/admin) & AUD-08 (dedupe advertência) & AUD-10 (menções + blocks)
-- =============================================================================
do $$
declare
  v_rep_id   uuid;
  v_warn_id  uuid;
  v_ch_notif int;
  v_bob_notif int;
begin
  -- Moderador NÃO pode advertir Admin (AUD-04)
  perform set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  execute 'set local role authenticated';
  begin
    perform public.issue_user_warning('55555555-5555-5555-5555-555555555555', 'spam', 'low', 'Tentativa indevida de advertir admin');
    raise exception 'AUD-04 FAILED: moderador advertiu admin';
  exception when insufficient_privilege then null; end;

  -- Cria report e emite advertência contra Bob; segunda advertência no mesmo report falha (AUD-08)
  insert into public.reports (profile_id, reason, details) values ('22222222-2222-2222-2222-222222222222', 'spam', 'Spam teste') returning id into v_rep_id;
  v_warn_id := public.issue_user_warning('22222222-2222-2222-2222-222222222222', 'spam', 'medium', 'Advertência formal por spam de teste', null, null, v_rep_id);
  begin
    perform public.issue_user_warning('22222222-2222-2222-2222-222222222222', 'spam', 'medium', 'Segunda advertência duplicada mesmo report', null, null, v_rep_id);
    raise exception 'AUD-08 FAILED: advertência duplicada permitida';
  exception when unique_violation then null; end;

  -- Revoga advertência com motivo
  perform public.revoke_user_warning(v_warn_id, 'Revisão administrativa');
  execute 'reset role';

  -- AUD-10: Alice menciona @bob, @charlie (que bloqueou Alice) e @alice (própria)
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  execute 'set local role authenticated';
  insert into public.topics (category_id, title, body)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Teste de menções bloqueadas', 'Olá @bob, @charlie e @alice!');
  execute 'reset role';

  select count(*) into v_bob_notif from public.notifications where user_id = '22222222-2222-2222-2222-222222222222' and type = 'mention';
  select count(*) into v_ch_notif  from public.notifications where user_id = '33333333-3333-3333-3333-333333333333' and type = 'mention';
  if v_bob_notif <> 1 or v_ch_notif <> 0 then
    raise exception 'AUD-10 FAILED: bob_notif=%, charlie_notif=%', v_bob_notif, v_ch_notif;
  end if;

  raise notice 'PASS AUD-04, AUD-08 & AUD-10: hierarquia, dedupe de advertência, revogação e menções com user_blocks OK';
end $$;
