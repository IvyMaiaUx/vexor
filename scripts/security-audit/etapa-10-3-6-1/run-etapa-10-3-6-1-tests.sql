-- =============================================================================
-- VEXOR — ETAPA 10.3.6.1: TESTES DE GRANTS, RLS E REALTIME
-- Executado exclusivamente em banco local isolado (vexor_etapa10_3_6_1).
-- =============================================================================
\set ON_ERROR_STOP on

-- =============================================================================
-- BLOCO 1: POST-01 (Grants por coluna em public.topics + bloqueios de RLS)
-- =============================================================================
do $$
declare
  v_topic_id uuid;
  v_author   uuid;
  v_status   public.content_status;
  v_votes    int;
begin
  -- 1. anon bloqueado em INSERT e SELECT
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
  begin
    insert into public.topics (category_id, title, body, kind)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Anon tentativa', 'Body valido com mais de 10 chars', 'note');
    raise exception 'FAIL: anon inseriu em topics';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- 2. Membro ativo Alice insere com as novas colunas sociais (kind, shared_url, resource_id)
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  execute 'set local role authenticated';
  insert into public.topics (category_id, title, body, kind, shared_url, resource_id)
  values (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Compartilhamento de ferramenta',
    'Descricao detalhada da ferramenta de analise de logs.',
    'tool_share',
    'https://github.com/vexor-sec/sample-tool',
    null
  )
  returning id, author_id, status, vote_count into v_topic_id, v_author, v_status, v_votes;

  if v_topic_id is null or v_author <> '11111111-1111-1111-1111-111111111111' or v_status <> 'published' or v_votes <> 0 then
    raise exception 'FAIL: valores default/autoria incorretos (author=%, status=%, votes=%)', v_author, v_status, v_votes;
  end if;

  -- 3. Colunas administrativas bloqueadas para INSERT (42501)
  begin
    insert into public.topics (category_id, title, body, author_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Spoof author', 'Body valido com mais de 10 chars', '22222222-2222-2222-2222-222222222222');
    raise exception 'FAIL: authenticated escreveu em author_id';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.topics (category_id, title, body, status)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Spoof status', 'Body valido com mais de 10 chars', 'hidden');
    raise exception 'FAIL: authenticated escreveu em status';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.topics (category_id, title, body, vote_count)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Spoof votes', 'Body valido com mais de 10 chars', 999);
    raise exception 'FAIL: authenticated escreveu em vote_count';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.topics (category_id, title, body, created_at)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Spoof created', 'Body valido com mais de 10 chars', now() - interval '10 days');
    raise exception 'FAIL: authenticated escreveu em created_at';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  -- 4. Usuário suspenso bloqueado pela policy topics_insert_member (42501)
  perform set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true);
  execute 'set local role authenticated';
  begin
    insert into public.topics (category_id, title, body, kind)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Suspenso tentando postar', 'Body valido com mais de 10 chars', 'discussion');
    raise exception 'FAIL: usuário suspenso publicou em topics';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  raise notice 'PASS POST-01: grants sociais em topics OK e colunas administrativas protegidas (42501)';
end $$;

-- =============================================================================
-- BLOCO 2: POST-02 (Publicação supabase_realtime e idempotência)
-- =============================================================================
do $$
declare
  v_has_dm    boolean;
  v_has_notif boolean;
  v_has_posts boolean;
  v_pub_count int;
begin
  select exists (
    select 1 from pg_catalog.pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
  ) into v_has_dm;

  select exists (
    select 1 from pg_catalog.pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) into v_has_notif;

  select exists (
    select 1 from pg_catalog.pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts'
  ) into v_has_posts;

  select count(*) into v_pub_count
    from pg_catalog.pg_publication_tables
   where pubname = 'supabase_realtime';

  if not v_has_dm or not v_has_notif or not v_has_posts or v_pub_count <> 3 then
    raise exception 'FAIL POST-02: dm=%, notif=%, posts=%, total=%', v_has_dm, v_has_notif, v_has_posts, v_pub_count;
  end if;

  raise notice 'PASS POST-02: direct_messages e notifications em supabase_realtime (total=3 com posts preservada)';
end $$;
