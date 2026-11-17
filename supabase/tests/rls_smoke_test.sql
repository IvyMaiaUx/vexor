-- =============================================================================
-- RLS smoke test. Run after migrations + seed:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_smoke_test.sql
-- Runs in a transaction and rolls back. Any failed assertion aborts the run.
-- =============================================================================
begin;

create function pg_temp.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
end $$;
create function pg_temp.reset() returns void language plpgsql as $$
begin execute 'reset role'; end $$;
-- expect(label, sql, should_succeed)
create function pg_temp.expect(p_label text, p_sql text, p_ok boolean) returns void language plpgsql as $$
declare v_ok boolean := true; v_rows int;
begin
  begin
    execute p_sql; get diagnostics v_rows = row_count;
    -- an UPDATE/DELETE filtered out by RLS affects 0 rows: treat as denied
    if v_rows = 0 and p_sql ~* '^\s*(update|delete)' then v_ok := false; end if;
  exception when others then v_ok := false;
  end;
  if v_ok <> p_ok then raise exception 'FAILED: % (expected %, got %)', p_label, p_ok, v_ok; end if;
  raise notice 'ok   %', p_label;
end $$;

-- Fixtures (as superuser)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@x.test', '{"username":"admin1"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'mod@x.test',   '{"username":"mod1"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'alice@x.test', '{"username":"alice","role":"admin"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'bob@x.test',   '{"username":"Bad Name!"}');
update public.profiles set role = 'admin'     where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set role = 'moderator' where id = '00000000-0000-0000-0000-0000000000b1';

do $$ begin
  assert (select role from public.profiles where username = 'alice') = 'member', 'metadata must not grant role';
  assert (select username from public.profiles where id = '00000000-0000-0000-0000-0000000000c2') like 'user\_%', 'invalid username falls back';
end $$;

-- Alice submits a resource (with >500 chars description, up to 2000 limit)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect('member can submit resource (up to 2000 chars description)',
  $q$insert into public.resources (name, description, category_id, type, url)
     select 'Wireshark Lab', repeat('Hands-on packet analysis lab for beginners. ', 15), id, 'lab', 'https://example.org/wlab'
     from public.categories where slug = 'network-security'$q$, true);
select pg_temp.expect('duplicate URL with uppercase host and default port :443 blocked',
  $q$insert into public.resources (name, description, category_id, type, url)
     select 'Wireshark Lab Dup', 'Duplicate host/scheme normalization check.', id, 'lab', 'HTTPS://EXAMPLE.ORG:443/wlab'
     from public.categories where slug = 'network-security'$q$, false);
do $$ begin
  assert public.normalize_resource_url('HTTPS://EXAMPLE.ORG:443/') = 'https://example.org',
    'root slash and uppercase host should normalize';
  assert public.normalize_resource_url('https://example.org/Wlab') <> public.normalize_resource_url('https://example.org/wlab'),
    'case-sensitive paths must not collide';
  assert public.normalize_resource_url('https://example.org/wlab/') <> public.normalize_resource_url('https://example.org/wlab'),
    'non-root trailing slash paths must not collide';
end $$;
select pg_temp.expect('member cannot self-approve (status column)',
  $q$update public.resources set status = 'approved'$q$, false);
select pg_temp.expect('member cannot forge submitted_by',
  $q$insert into public.resources (name, description, category_id, type, url, submitted_by)
     select 'X Tool', 'Some description text.', id, 'tool', 'https://example.org/x', '00000000-0000-0000-0000-0000000000b1'
     from public.categories limit 1$q$, false);
select pg_temp.expect('javascript: URL rejected',
  $q$insert into public.resources (name, description, category_id, type, url)
     select 'Evil', 'Some description text.', id, 'tool', 'javascript:alert(1)' from public.categories limit 1$q$, false);
select pg_temp.expect('member cannot change own role',
  $q$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c1'$q$, false);
select pg_temp.expect('member can edit own bio',
  $q$update public.profiles set bio = 'hello' where id = '00000000-0000-0000-0000-0000000000c1'$q$, true);
select pg_temp.expect('member cannot edit others profile',
  $q$update public.profiles set bio = 'pwn' where id = '00000000-0000-0000-0000-0000000000c2'$q$, false);
select pg_temp.expect('member cannot call moderate_resource',
  $q$select public.moderate_resource((select id from public.resources limit 1), 'approved')$q$, false);
select pg_temp.expect('member cannot call admin_set_user_role',
  $q$select public.admin_set_user_role('00000000-0000-0000-0000-0000000000c1', 'admin')$q$, false);
select pg_temp.expect('member cannot read audit_logs', $q$select 1 from public.audit_logs$q$, true); -- allowed query, but must be empty
do $$ begin assert (select count(*) from public.audit_logs) = 0, 'audit_logs leaked to member'; end $$;

-- Visitors
select pg_temp.reset(); select pg_temp.as_anon();
do $$ begin assert (select count(*) from public.resources) = 0, 'anon must not see pending resources'; end $$;
select pg_temp.expect('anon cannot insert resource',
  $q$insert into public.resources (name, description, category_id, type, url)
     select 'Anon', 'Some description text.', id, 'tool', 'https://example.org/a' from public.categories limit 1$q$, false);
select pg_temp.expect('anon cannot call rpc', $q$select public.moderate_post(gen_random_uuid(), 'hide', 'x')$q$, false);

-- Moderator approves
select pg_temp.reset(); select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('moderator sees pending', $q$select 1 from public.resources where status='pending' having count(*) = 1$q$, true);
select pg_temp.expect('moderator can approve',
  $q$select public.moderate_resource((select id from public.resources limit 1), 'approved')$q$, true);
select pg_temp.expect('rejecting requires reason',
  $q$select public.moderate_resource((select id from public.resources limit 1), 'rejected')$q$, false);
select pg_temp.expect('moderator cannot call admin_set_user_role', $q$select public.admin_set_user_role('00000000-0000-0000-0000-0000000000c1','moderator')$q$, false);

select pg_temp.reset(); select pg_temp.as_anon();
do $$ begin assert (select count(*) from public.resources) = 1, 'anon sees approved resource'; end $$;

-- Owner is frozen after approval
select pg_temp.reset(); select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect('owner cannot edit URL after approval',
  $q$update public.resources set url = 'https://evil.example/' where submitted_by = '00000000-0000-0000-0000-0000000000c1'$q$, false);
select pg_temp.expect('bookmark approved resource', $q$insert into public.bookmarks (resource_id) select id from public.resources$q$, true);
do $$ begin assert (select count(*) from public.notifications where type = 'resource_approved') = 1, 'approval notification'; end $$;

-- Forum
select pg_temp.expect('member creates topic',
  $q$insert into public.topics (category_id, title, body)
     select id, 'How do I start with DFIR?', 'Looking for beginner friendly resources please.' from public.categories where slug = 'dfir'$q$, true);
do $$ begin
  assert (select count(*) from public.topics where search_vector @@ plainto_tsquery('simple', 'DFIR beginner')) = 1,
    'forum topic full-text search_vector matches title and body';
end $$;
select pg_temp.expect('member cannot pin own topic', $q$update public.topics set is_pinned = true$q$, false);
select pg_temp.reset(); select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.expect('other member replies',
  $q$insert into public.posts (topic_id, body) select id, 'Try the SANS posters.' from public.topics$q$, true);
select pg_temp.expect('cannot vote own post',
  $q$insert into public.votes (post_id) select id from public.posts$q$, false);
select pg_temp.reset(); select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect('topic author votes reply', $q$insert into public.votes (post_id) select id from public.posts$q$, true);
do $$ begin assert (select vote_count from public.posts) = 1, 'vote_count trigger'; end $$;
select pg_temp.expect('topic author accepts solution',
  $q$select public.set_accepted_post((select id from public.topics), (select id from public.posts))$q$, true);
select pg_temp.expect('cannot delete answered topic', $q$delete from public.topics$q$, false);
select pg_temp.reset(); select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.expect('non-author cannot accept',
  $q$select public.set_accepted_post((select id from public.topics), (select id from public.posts))$q$, false);
select pg_temp.expect('member can report', $q$insert into public.reports (post_id, reason) select id, 'spam' from public.posts$q$, true);
select pg_temp.expect('duplicate open report blocked', $q$insert into public.reports (post_id, reason) select id, 'spam' from public.posts$q$, false);
select pg_temp.expect('report needs exactly one target', $q$insert into public.reports (reason) values ('spam')$q$, false);

-- Locked topic rules (blocks regular members from editing/deleting replies or changing accepted solution; preserves mod/admin)
select pg_temp.reset(); select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('mod locks topic',
  $q$select public.moderate_topic((select id from public.topics), 'lock')$q$, true);
select pg_temp.reset(); select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.expect('reply author cannot edit post in locked topic',
  $q$update public.posts set body = 'Edited while locked'$q$, false);
select pg_temp.expect('reply author cannot delete post in locked topic',
  $q$delete from public.posts$q$, false);
select pg_temp.reset(); select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect('topic author cannot change accepted solution in locked topic',
  $q$select public.set_accepted_post((select id from public.topics), null)$q$, false);
select pg_temp.reset(); select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('mod can still change accepted solution in locked topic',
  $q$select public.set_accepted_post((select id from public.topics), (select id from public.posts))$q$, true);
select pg_temp.expect('mod unlocks topic',
  $q$select public.moderate_topic((select id from public.topics), 'unlock')$q$, true);

-- Moderation + audit
select pg_temp.expect('mod hides post', $q$select public.moderate_post((select id from public.posts), 'hide', 'spam')$q$, true);
select pg_temp.expect('mod resolves report', $q$select public.resolve_report((select id from public.reports), 'resolved', 'done')$q$, true);
select pg_temp.reset(); select pg_temp.as_anon();
do $$ begin assert (select count(*) from public.posts) = 0, 'hidden post invisible to visitors'; end $$;
select pg_temp.reset(); select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect('admin promotes user', $q$select public.admin_set_user_role('00000000-0000-0000-0000-0000000000c2', 'moderator')$q$, true);
select pg_temp.expect('admin cannot demote self', $q$select public.admin_set_user_role('00000000-0000-0000-0000-0000000000a1', 'member')$q$, false);
select pg_temp.expect('admin creates category (audited)',
  $q$insert into public.categories (slug, name_en, name_pt, scope, sort_order)
     values ('hardware-hacking', 'Hardware Hacking', 'Hardware Hacking', 'both', 130)$q$, true);
select pg_temp.expect('admin updates category (audited)',
  $q$update public.categories set sort_order = 135 where slug = 'hardware-hacking'$q$, true);
do $$ begin
  assert (select count(*) from public.audit_logs where entity_type = 'category' and action in ('category.created', 'category.updated')) = 2,
    'category changes recorded in audit_logs';
  assert (select count(*) from public.audit_logs) = 9,
    'admin reads audit log (9 audited actions so far)';
end $$;
select pg_temp.expect('audit log immutable (update)', $q$update public.audit_logs set action = 'x'$q$, false);
select pg_temp.expect('audit log immutable (delete)', $q$delete from public.audit_logs$q$, false);

-- Suspension strips all write privileges (including profile, bookmarks and avatar storage)
select pg_temp.expect('admin suspends user', $q$select public.admin_set_user_suspension('00000000-0000-0000-0000-0000000000c1', true, 'abuse')$q$, true);
select pg_temp.reset(); select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect('suspended user cannot create topic',
  $q$insert into public.topics (category_id, title, body) select id, 'Suspended topic', 'Should not be allowed at all.' from public.categories limit 1$q$, false);
select pg_temp.expect('suspended user cannot edit own profile',
  $q$update public.profiles set bio = 'suspended bio' where id = '00000000-0000-0000-0000-0000000000c1'$q$, false);
select pg_temp.expect('suspended user cannot delete bookmark',
  $q$delete from public.bookmarks$q$, false);
select pg_temp.expect('suspended user cannot upload avatar',
  $q$insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-0000000000c1/avatar.png')$q$, false);

select pg_temp.reset();
rollback;
\echo 'ALL RLS CHECKS PASSED'
