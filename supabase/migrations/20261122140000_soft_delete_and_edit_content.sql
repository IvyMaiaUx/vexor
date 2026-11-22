-- =============================================================================
-- VEXOR — Soft Delete (deleted_at) + Edit Tracking (edited_at) for Topics & Posts
-- Migration: 20261122140000_soft_delete_and_edit_content.sql
--
-- Reversible migration (see DOWN section at the bottom).
-- Enforces at the database level (column grants + RLS + BEFORE UPDATE triggers + RPCs):
--   1. No physical DELETE for clients on public.topics and public.posts.
--   2. Only the author (auth.uid() = author_id) can edit content; edited_at is set automatically.
--   3. Author or admin/mod (public.is_moderator()) can soft-delete (set deleted_at / deleted_by).
--   4. Admin/mod CANNOT edit content of another user's topic or comment.
--   5. Restore (Undo) clears deleted_at/deleted_by only within a 60-second window and only
--      by the actor who deleted it (deleted_by = auth.uid()) or by admin/mod.
--   6. Comments with active child replies (parent_post_id) remain selectable as placeholders
--      ("[comentário removido]") while replies stay visible; comments without replies disappear.
-- =============================================================================

begin;

-- 1. Columns on topics and posts
alter table public.topics
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id) on delete set null,
  add column if not exists edited_at  timestamptz;

alter table public.posts
  add column if not exists deleted_at     timestamptz,
  add column if not exists deleted_by     uuid references public.profiles (id) on delete set null,
  add column if not exists edited_at      timestamptz,
  add column if not exists parent_post_id uuid references public.posts (id) on delete set null;

create index if not exists topics_active_feed_idx
  on public.topics (created_at desc, id desc)
  where status = 'published' and deleted_at is null;

create index if not exists topics_deleted_purge_idx
  on public.topics (deleted_at)
  where deleted_at is not null;

create index if not exists posts_active_topic_idx
  on public.posts (topic_id, created_at)
  where status = 'published' and deleted_at is null;

create index if not exists posts_parent_idx
  on public.posts (parent_post_id)
  where parent_post_id is not null and deleted_at is null;

create index if not exists posts_deleted_purge_idx
  on public.posts (deleted_at)
  where deleted_at is not null;

-- 2. Revoke physical DELETE on topics and posts for authenticated clients
revoke delete on public.topics, public.posts from authenticated;
drop policy if exists topics_delete_owner_unanswered on public.topics;
drop policy if exists topics_delete_admin            on public.topics;
drop policy if exists posts_delete_owner             on public.posts;
drop policy if exists posts_delete_admin             on public.posts;

-- 3. Column-level UPDATE / INSERT grants (edited_at is managed strictly by trigger)
grant update (category_id, title, body, shared_url, deleted_at, deleted_by)
  on public.topics to authenticated;
grant update (body, deleted_at, deleted_by)
  on public.posts to authenticated;
grant insert (topic_id, body, parent_post_id)
  on public.posts to authenticated;

-- 4. Helpers (SECURITY DEFINER, set search_path = '')
create or replace function public.post_has_active_replies(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.posts r
     where r.parent_post_id = p_post_id
       and r.status = 'published'
       and r.deleted_at is null
  );
$$;
revoke all on function public.post_has_active_replies(uuid) from public, anon;
grant execute on function public.post_has_active_replies(uuid) to authenticated;

create or replace function public.is_valid_parent_post(
  p_topic_id       uuid,
  p_parent_post_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_parent_post_id is null
     or exists (
       select 1
         from public.posts parent
        where parent.id = p_parent_post_id
          and parent.topic_id = p_topic_id
          and parent.status = 'published'
          and parent.deleted_at is null
     );
$$;
revoke all on function public.is_valid_parent_post(uuid, uuid) from public, anon;
grant execute on function public.is_valid_parent_post(uuid, uuid) to authenticated;

create or replace function public.is_notification_target_active(
  p_topic_id uuid,
  p_post_id  uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (p_topic_id is null or exists (
      select 1 from public.topics t
       where t.id = p_topic_id
         and t.deleted_at is null
    ))
    and (p_post_id is null or exists (
      select 1 from public.posts p
       where p.id = p_post_id
         and p.deleted_at is null
    ));
$$;
revoke all on function public.is_notification_target_active(uuid, uuid) from public, anon;
grant execute on function public.is_notification_target_active(uuid, uuid) to authenticated;

-- 5. BEFORE UPDATE guard triggers (enforce rules even on direct REST PATCH)
create or replace function public.topics_guard_edit_and_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid             uuid := auth.uid();
  v_is_mod          boolean := public.is_moderator();
  v_content_changed boolean;
begin
  -- Allow system/migration updates without an authenticated JWT context
  if v_uid is null then
    return new;
  end if;

  v_content_changed :=
    new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.category_id is distinct from old.category_id
    or new.shared_url is distinct from old.shared_url;

  -- Only the author can edit content (admin/mod cannot edit someone else's post)
  if v_content_changed then
    if old.author_id is distinct from v_uid then
      raise exception 'only the author can edit topic content' using errcode = '42501';
    end if;
    if old.deleted_at is not null or new.deleted_at is not null then
      raise exception 'cannot edit a deleted topic' using errcode = '42501';
    end if;
    new.edited_at := now();
  end if;

  -- Soft delete
  if old.deleted_at is null and new.deleted_at is not null then
    if old.author_id is distinct from v_uid and not v_is_mod then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    new.deleted_at := now();
    new.deleted_by := v_uid;
  -- Restore (Undo) within short 60s window
  elsif old.deleted_at is not null and new.deleted_at is null then
    if (old.deleted_by is distinct from v_uid and not v_is_mod)
       or old.deleted_at < now() - interval '60 seconds' then
      raise exception 'restore window expired or forbidden' using errcode = '42501';
    end if;
    new.deleted_by := null;
  else
    new.deleted_at := old.deleted_at;
    new.deleted_by := old.deleted_by;
  end if;

  return new;
end;
$$;
revoke all on function public.topics_guard_edit_and_soft_delete() from public, anon, authenticated;

drop trigger if exists topics_guard_edit_and_soft_delete_trg on public.topics;
create trigger topics_guard_edit_and_soft_delete_trg
  before update on public.topics
  for each row execute function public.topics_guard_edit_and_soft_delete();

create or replace function public.posts_guard_edit_and_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid             uuid := auth.uid();
  v_is_mod          boolean := public.is_moderator();
  v_content_changed boolean;
begin
  if v_uid is null then
    return new;
  end if;

  v_content_changed := new.body is distinct from old.body;

  if v_content_changed then
    if old.author_id is distinct from v_uid then
      raise exception 'only the author can edit comment content' using errcode = '42501';
    end if;
    if old.deleted_at is not null or new.deleted_at is not null then
      raise exception 'cannot edit a deleted comment' using errcode = '42501';
    end if;
    new.edited_at := now();
  end if;

  if old.deleted_at is null and new.deleted_at is not null then
    if old.author_id is distinct from v_uid and not v_is_mod then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    new.deleted_at := now();
    new.deleted_by := v_uid;
  elsif old.deleted_at is not null and new.deleted_at is null then
    if (old.deleted_by is distinct from v_uid and not v_is_mod)
       or old.deleted_at < now() - interval '60 seconds' then
      raise exception 'restore window expired or forbidden' using errcode = '42501';
    end if;
    new.deleted_by := null;
  else
    new.deleted_at := old.deleted_at;
    new.deleted_by := old.deleted_by;
  end if;

  return new;
end;
$$;
revoke all on function public.posts_guard_edit_and_soft_delete() from public, anon, authenticated;

drop trigger if exists posts_guard_edit_and_soft_delete_trg on public.posts;
create trigger posts_guard_edit_and_soft_delete_trg
  before update on public.posts
  for each row execute function public.posts_guard_edit_and_soft_delete();

-- 6. Updated RLS policies on topics, posts, votes, topic_votes, notifications
drop policy if exists topics_select           on public.topics;
drop policy if exists topics_update_owner     on public.topics;
drop policy if exists topics_update_moderator on public.topics;

create policy topics_select on public.topics
  for select to authenticated
  using (
    (status = 'published' and deleted_at is null)
    or (deleted_by = (select auth.uid()) and deleted_at >= now() - interval '60 seconds')
    or (select public.is_moderator())
  );

create policy topics_update_owner on public.topics
  for update to authenticated
  using (
    author_id = (select auth.uid())
    and status = 'published'
    and not is_locked
    and (select public.is_active_member())
    and (deleted_at is null or (deleted_by = (select auth.uid()) and deleted_at >= now() - interval '60 seconds'))
  )
  with check (
    author_id = (select auth.uid())
    and status = 'published'
    and not is_locked
    and (select public.is_active_member())
  );

create policy topics_update_moderator on public.topics
  for update to authenticated
  using      ((select public.is_moderator()))
  with check ((select public.is_moderator()));

drop policy if exists posts_select           on public.posts;
drop policy if exists posts_insert_member    on public.posts;
drop policy if exists posts_update_owner     on public.posts;
drop policy if exists posts_update_moderator on public.posts;

create policy posts_select on public.posts
  for select to authenticated
  using (
    (
      status = 'published'
      and exists (
        select 1 from public.topics t
         where t.id = posts.topic_id
           and t.status = 'published'
           and t.deleted_at is null
      )
      and (deleted_at is null or public.post_has_active_replies(posts.id))
    )
    or (deleted_by = (select auth.uid()) and deleted_at >= now() - interval '60 seconds')
    or (select public.is_moderator())
  );

create policy posts_insert_member on public.posts
  for insert to authenticated
  with check (
    (select public.is_active_member())
    and author_id = (select auth.uid())
    and status = 'published'
    and deleted_at is null
    and exists (
      select 1 from public.topics t
       where t.id = posts.topic_id
         and t.status = 'published'
         and t.deleted_at is null
         and (not t.is_locked or (select public.is_moderator()))
    )
    and public.is_valid_parent_post(posts.topic_id, posts.parent_post_id)
  );

create policy posts_update_owner on public.posts
  for update to authenticated
  using (
    author_id = (select auth.uid())
    and status = 'published'
    and (select public.is_active_member())
    and (deleted_at is null or (deleted_by = (select auth.uid()) and deleted_at >= now() - interval '60 seconds'))
    and exists (
      select 1 from public.topics t
       where t.id = posts.topic_id
         and t.status = 'published'
         and t.deleted_at is null
         and (not t.is_locked or (select public.is_moderator()))
    )
  )
  with check (
    author_id = (select auth.uid())
    and status = 'published'
    and (select public.is_active_member())
  );

create policy posts_update_moderator on public.posts
  for update to authenticated
  using      ((select public.is_moderator()))
  with check ((select public.is_moderator()));

-- Block voting on soft-deleted topics/posts
drop policy if exists topic_votes_insert on public.topic_votes;
create policy topic_votes_insert on public.topic_votes
  for insert to authenticated
  with check (
    (select public.is_active_member())
    and user_id = (select auth.uid())
    and exists (
      select 1 from public.topics t
       where t.id = topic_id
         and t.status = 'published'
         and t.deleted_at is null
    )
  );

drop policy if exists votes_insert_member on public.votes;
create policy votes_insert_member on public.votes
  for insert to authenticated
  with check (
    (select public.is_active_member())
    and user_id = (select auth.uid())
    and exists (
      select 1 from public.posts p
      join public.topics t on t.id = p.topic_id
       where p.id = votes.post_id
         and p.status = 'published'
         and p.deleted_at is null
         and t.status = 'published'
         and t.deleted_at is null
         and p.author_id is distinct from (select auth.uid())
    )
  );

-- Filter notifications pointing to soft-deleted topics/posts
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_notification_target_active(topic_id, post_id)
  );

-- 7. RPCs for soft-delete and undo restore (with audit log on moderation actions)
create or replace function public.soft_delete_topic(p_topic_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_topic record;
  v_now   timestamptz := now();
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select id, author_id, is_locked, deleted_at
    into v_topic
    from public.topics
   where id = p_topic_id
     for update;

  if not found or v_topic.deleted_at is not null then
    raise exception 'topic not found' using errcode = 'P0002';
  end if;

  if v_topic.author_id is distinct from v_uid and not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_topic.is_locked and not public.is_moderator() then
    raise exception 'topic is locked' using errcode = '42501';
  end if;

  update public.topics
     set deleted_at = v_now,
         deleted_by = v_uid
   where id = p_topic_id;

  if v_topic.author_id is distinct from v_uid then
    perform public.write_audit_log(
      'topic.soft_deleted',
      'topic',
      p_topic_id,
      jsonb_build_object('author_id', v_topic.author_id)
    );
  end if;

  return v_now;
end;
$$;

create or replace function public.restore_topic(p_topic_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_topic record;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select id, author_id, deleted_at, deleted_by
    into v_topic
    from public.topics
   where id = p_topic_id
     for update;

  if not found or v_topic.deleted_at is null then
    raise exception 'topic not found' using errcode = 'P0002';
  end if;

  if (v_topic.deleted_by is distinct from v_uid and not public.is_moderator())
     or v_topic.deleted_at < now() - interval '60 seconds' then
    raise exception 'restore window expired or forbidden' using errcode = '42501';
  end if;

  update public.topics
     set deleted_at = null,
         deleted_by = null
   where id = p_topic_id;
end;
$$;

create or replace function public.soft_delete_post(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid         uuid := auth.uid();
  v_post        record;
  v_now         timestamptz := now();
  v_has_replies boolean;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select p.id, p.topic_id, p.author_id, p.deleted_at, t.is_locked
    into v_post
    from public.posts p
    join public.topics t on t.id = p.topic_id
   where p.id = p_post_id
     for update of p;

  if not found or v_post.deleted_at is not null then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  if v_post.author_id is distinct from v_uid and not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_post.is_locked and not public.is_moderator() then
    raise exception 'topic is locked' using errcode = '42501';
  end if;

  update public.posts
     set deleted_at = v_now,
         deleted_by = v_uid
   where id = p_post_id;

  v_has_replies := public.post_has_active_replies(p_post_id);

  if v_post.author_id is distinct from v_uid then
    perform public.write_audit_log(
      'post.soft_deleted',
      'post',
      p_post_id,
      jsonb_build_object('topic_id', v_post.topic_id, 'author_id', v_post.author_id)
    );
  end if;

  return jsonb_build_object('deleted_at', v_now, 'has_replies', v_has_replies);
end;
$$;

create or replace function public.restore_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_post record;
begin
  if v_uid is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select id, deleted_at, deleted_by
    into v_post
    from public.posts
   where id = p_post_id
     for update;

  if not found or v_post.deleted_at is null then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  if (v_post.deleted_by is distinct from v_uid and not public.is_moderator())
     or v_post.deleted_at < now() - interval '60 seconds' then
    raise exception 'restore window expired or forbidden' using errcode = '42501';
  end if;

  update public.posts
     set deleted_at = null,
         deleted_by = null
   where id = p_post_id;
end;
$$;

revoke all on function public.soft_delete_topic(uuid) from public, anon;
revoke all on function public.restore_topic(uuid)     from public, anon;
revoke all on function public.soft_delete_post(uuid)  from public, anon;
revoke all on function public.restore_post(uuid)      from public, anon;

grant execute on function public.soft_delete_topic(uuid) to authenticated;
grant execute on function public.restore_topic(uuid)     to authenticated;
grant execute on function public.soft_delete_post(uuid)  to authenticated;
grant execute on function public.restore_post(uuid)      to authenticated;

commit;

-- =============================================================================
-- DOWN (Manual rollback script — do not execute during UP migration):
--
-- begin;
--   -- 1. Restore policies BEFORE dropping helper functions they depend on
--   drop policy if exists posts_select            on public.posts;
--   drop policy if exists posts_insert_member     on public.posts;
--   drop policy if exists posts_update_owner      on public.posts;
--   drop policy if exists posts_update_moderator  on public.posts;
--   drop policy if exists topics_select           on public.topics;
--   drop policy if exists topics_update_owner     on public.topics;
--   drop policy if exists topics_update_moderator on public.topics;
--   drop policy if exists topic_votes_insert      on public.topic_votes;
--   drop policy if exists votes_insert_member     on public.votes;
--   drop policy if exists notifications_select_own on public.notifications;
--
--   create policy topics_select on public.topics
--     for select to authenticated
--     using (
--       status = 'published'
--       or author_id = (select auth.uid())
--       or (select public.is_moderator())
--     );
--
--   create policy topics_update_owner on public.topics
--     for update to authenticated
--     using (
--       author_id = (select auth.uid())
--       and status = 'published'
--       and not is_locked
--       and (select public.is_active_member())
--     )
--     with check (
--       author_id = (select auth.uid())
--       and status = 'published'
--       and not is_locked
--       and (select public.is_active_member())
--     );
--
--   create policy topics_update_moderator on public.topics
--     for update to authenticated
--     using      ((select public.is_moderator()))
--     with check ((select public.is_moderator()));
--
--   create policy posts_select on public.posts
--     for select to authenticated
--     using (
--       status = 'published'
--       or author_id = (select auth.uid())
--       or (select public.is_moderator())
--     );
--
--   create policy posts_insert_member on public.posts
--     for insert to authenticated
--     with check (
--       (select public.is_active_member())
--       and author_id = (select auth.uid())
--       and status = 'published'
--       and exists (
--         select 1 from public.topics t
--          where t.id = posts.topic_id
--            and t.status = 'published'
--            and (not t.is_locked or (select public.is_moderator()))
--       )
--     );
--
--   create policy posts_update_owner on public.posts
--     for update to authenticated
--     using (
--       author_id = (select auth.uid())
--       and status = 'published'
--       and (select public.is_active_member())
--       and exists (
--         select 1 from public.topics t
--          where t.id = posts.topic_id
--            and t.status = 'published'
--            and (not t.is_locked or (select public.is_moderator()))
--       )
--     )
--     with check (
--       author_id = (select auth.uid())
--       and status = 'published'
--       and (select public.is_active_member())
--       and exists (
--         select 1 from public.topics t
--          where t.id = posts.topic_id
--            and t.status = 'published'
--            and (not t.is_locked or (select public.is_moderator()))
--       )
--     );
--
--   create policy topic_votes_insert on public.topic_votes
--     for insert to authenticated
--     with check (
--       (select public.is_active_member())
--       and user_id = (select auth.uid())
--       and exists (select 1 from public.topics t where t.id = topic_id and t.status = 'published')
--     );
--
--   create policy votes_insert_member on public.votes
--     for insert to authenticated
--     with check (
--       (select public.is_active_member())
--       and user_id = (select auth.uid())
--       and exists (
--         select 1 from public.posts p
--         join public.topics t on t.id = p.topic_id
--          where p.id = votes.post_id
--            and p.status = 'published'
--            and t.status = 'published'
--            and p.author_id is distinct from (select auth.uid())
--       )
--     );
--
--   create policy notifications_select_own on public.notifications
--     for select to authenticated
--     using (user_id = (select auth.uid()));
--
--   -- 2. Drop RPCs, triggers, helpers, indexes, and columns
--   drop function if exists public.soft_delete_topic(uuid);
--   drop function if exists public.restore_topic(uuid);
--   drop function if exists public.soft_delete_post(uuid);
--   drop function if exists public.restore_post(uuid);
--   drop trigger if exists topics_guard_edit_and_soft_delete_trg on public.topics;
--   drop trigger if exists posts_guard_edit_and_soft_delete_trg  on public.posts;
--   drop function if exists public.topics_guard_edit_and_soft_delete();
--   drop function if exists public.posts_guard_edit_and_soft_delete();
--   drop function if exists public.post_has_active_replies(uuid);
--   drop function if exists public.is_notification_target_active(uuid, uuid);
--   drop index if exists public.topics_active_feed_idx;
--   drop index if exists public.topics_deleted_purge_idx;
--   drop index if exists public.posts_active_topic_idx;
--   drop index if exists public.posts_parent_idx;
--   drop index if exists public.posts_deleted_purge_idx;
--   alter table public.posts
--     drop column if exists parent_post_id,
--     drop column if exists edited_at,
--     drop column if exists deleted_by,
--     drop column if exists deleted_at;
--   alter table public.topics
--     drop column if exists edited_at,
--     drop column if exists deleted_by,
--     drop column if exists deleted_at;
--   grant delete on public.topics, public.posts to authenticated;
-- commit;
-- =============================================================================
