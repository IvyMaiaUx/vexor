-- =============================================================================
-- Migration 02 — Functions and triggers
--
-- Design rule: clients can only write "content" columns directly (see
-- migration 03 column grants). Anything that changes state, permissions or
-- moderation fields goes through a SECURITY DEFINER function that checks the
-- caller's role itself and writes an audit log entry.
--
-- All SECURITY DEFINER functions use `set search_path = ''` and fully
-- qualified names to prevent search_path hijacking.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at   before update on public.profiles   for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger resources_set_updated_at  before update on public.resources  for each row execute function public.set_updated_at();
create trigger topics_set_updated_at     before update on public.topics     for each row execute function public.set_updated_at();
create trigger posts_set_updated_at      before update on public.posts      for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Authorization helpers (used by RLS policies)
-- Suspended users resolve to NULL role: they lose every privilege.
-- -----------------------------------------------------------------------------
create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and not p.is_suspended;
$$;

create function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and not p.is_suspended
  );
$$;

create function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() in ('moderator', 'admin'), false);
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

-- True if a topic has any reply, including hidden ones (bypasses RLS on purpose).
create function public.topic_has_replies(p_topic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.posts where topic_id = p_topic_id);
$$;

-- -----------------------------------------------------------------------------
-- Audit log (append-only)
-- -----------------------------------------------------------------------------
create function public.write_audit_log(
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid,
  p_metadata    jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;

create function public.audit_logs_block_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs is append-only' using errcode = '42501';
end;
$$;

create trigger audit_logs_no_update_delete
  before update or delete on public.audit_logs
  for each row execute function public.audit_logs_block_mutation();
create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function public.audit_logs_block_mutation();

-- Audit administrative changes to categories (skips unauthenticated seed.sql runs).
create function public.on_category_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return null;
  end if;

  if tg_op = 'INSERT' then
    perform public.write_audit_log(
      'category.created',
      'category',
      new.id,
      jsonb_build_object(
        'slug', new.slug,
        'name_en', new.name_en,
        'name_pt', new.name_pt,
        'scope', new.scope,
        'is_active', new.is_active
      )
    );
  elsif tg_op = 'UPDATE' then
    perform public.write_audit_log(
      'category.updated',
      'category',
      new.id,
      jsonb_build_object(
        'before', jsonb_build_object(
          'slug', old.slug,
          'name_en', old.name_en,
          'name_pt', old.name_pt,
          'scope', old.scope,
          'is_active', old.is_active,
          'sort_order', old.sort_order
        ),
        'after', jsonb_build_object(
          'slug', new.slug,
          'name_en', new.name_en,
          'name_pt', new.name_pt,
          'scope', new.scope,
          'is_active', new.is_active,
          'sort_order', new.sort_order
        )
      )
    );
  elsif tg_op = 'DELETE' then
    perform public.write_audit_log(
      'category.deleted',
      'category',
      old.id,
      jsonb_build_object(
        'slug', old.slug,
        'name_en', old.name_en,
        'name_pt', old.name_pt
      )
    );
  end if;

  return null;
end;
$$;

create trigger categories_after_change
  after insert or update or delete on public.categories
  for each row execute function public.on_category_changed();

-- -----------------------------------------------------------------------------
-- New user -> profile.
-- Role is ALWAYS 'member'. raw_user_meta_data is user-controlled, so it is
-- only used for username / display_name after validation.
-- -----------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  v_fallback  text := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  v_display   text := nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 60), '');
  v_username  text;
begin
  if v_candidate ~ '^[a-z0-9_]{3,30}$'
     and not exists (select 1 from public.profiles where username = v_candidate) then
    v_username := v_candidate;
  else
    v_username := v_fallback;
  end if;

  begin
    insert into public.profiles (id, username, display_name)
    values (new.id, v_username, v_display);
  exception when unique_violation then
    insert into public.profiles (id, username, display_name)
    values (new.id, v_fallback, v_display);
  end;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Resources: slug generation (stable, unique, accent-insensitive)
-- -----------------------------------------------------------------------------
create function public.resources_set_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_base text;
begin
  v_base := trim(both '-' from regexp_replace(lower(extensions.unaccent(new.name)), '[^a-z0-9]+', '-', 'g'));
  v_base := left(coalesce(nullif(v_base, ''), 'resource'), 60);
  new.slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  return new;
end;
$$;

create trigger resources_before_insert_slug
  before insert on public.resources
  for each row execute function public.resources_set_slug();

-- -----------------------------------------------------------------------------
-- Forum triggers
-- -----------------------------------------------------------------------------
-- New reply: bump topic activity and notify the topic author.
create function public.on_post_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.topics set last_activity_at = now() where id = new.topic_id;

  insert into public.notifications (user_id, type, actor_id, topic_id, post_id)
  select t.author_id, 'topic_reply', new.author_id, t.id, new.id
  from public.topics t
  where t.id = new.topic_id
    and t.author_id is not null
    and t.author_id is distinct from new.author_id;

  return new;
end;
$$;

create trigger posts_after_insert
  after insert on public.posts
  for each row execute function public.on_post_created();

-- Keep posts.vote_count in sync (clients cannot write vote_count).
create function public.on_vote_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set vote_count = vote_count + 1 where id = new.post_id;
  else
    update public.posts set vote_count = greatest(vote_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger votes_after_change
  after insert or delete on public.votes
  for each row execute function public.on_vote_changed();

-- At most 5 tags per topic.
create function public.topic_tags_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.topic_tags where topic_id = new.topic_id) >= 5 then
    raise exception 'a topic can have at most 5 tags' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger topic_tags_before_insert
  before insert on public.topic_tags
  for each row execute function public.topic_tags_limit();

-- =============================================================================
-- Privileged RPCs (the only way to change roles, statuses and moderation state)
-- =============================================================================

-- ---- Administration ---------------------------------------------------------
create function public.admin_set_user_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.user_role;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'admins cannot demote themselves' using errcode = '42501';
  end if;

  select role into v_old from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
  perform public.write_audit_log('user.role_changed', 'profile', p_user_id,
                                 jsonb_build_object('from', v_old, 'to', p_role));
end;
$$;

create function public.admin_set_user_suspension(
  p_user_id   uuid,
  p_suspended boolean,
  p_reason    text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'admins cannot suspend themselves' using errcode = '42501';
  end if;
  if p_suspended and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'a reason is required to suspend a user' using errcode = '22023';
  end if;

  update public.profiles set is_suspended = p_suspended where id = p_user_id;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  perform public.write_audit_log(
    case when p_suspended then 'user.suspended' else 'user.unsuspended' end,
    'profile', p_user_id, jsonb_build_object('reason', p_reason));
end;
$$;

-- ---- Catalog moderation -----------------------------------------------------
create function public.moderate_resource(
  p_resource_id uuid,
  p_decision    public.resource_status,
  p_reason      text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submitter uuid;
begin
  if not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected', 'archived') then
    raise exception 'invalid decision: %', p_decision using errcode = '22023';
  end if;
  if p_decision = 'rejected' and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'a reason is required to reject a resource' using errcode = '22023';
  end if;

  update public.resources r
  set status           = p_decision,
      reviewed_by      = auth.uid(),
      reviewed_at      = now(),
      rejection_reason = case when p_decision = 'rejected' then p_reason else null end,
      published_at     = case when p_decision = 'approved' then coalesce(r.published_at, now())
                              else r.published_at end
  where r.id = p_resource_id
  returning r.submitted_by into v_submitter;

  if not found then
    raise exception 'resource not found' using errcode = 'P0002';
  end if;

  perform public.write_audit_log('resource.' || p_decision::text, 'resource', p_resource_id,
                                 jsonb_build_object('reason', p_reason));

  if p_decision in ('approved', 'rejected')
     and v_submitter is not null and v_submitter <> auth.uid() then
    insert into public.notifications (user_id, type, actor_id, resource_id)
    values (v_submitter,
            case when p_decision = 'approved' then 'resource_approved'::public.notification_type
                 else 'resource_rejected'::public.notification_type end,
            auth.uid(), p_resource_id);
  end if;
end;
$$;

-- Submitter edits a rejected resource and sends it back to the queue.
create function public.resubmit_resource(p_resource_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.resources
  set status = 'pending', rejection_reason = null, reviewed_by = null, reviewed_at = null
  where id = p_resource_id
    and submitted_by = auth.uid()
    and status = 'rejected';

  if not found then
    raise exception 'resource not found or not rejected' using errcode = 'P0002';
  end if;
end;
$$;

-- ---- Forum moderation -------------------------------------------------------
create function public.moderate_topic(p_topic_id uuid, p_action text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_action not in ('hide', 'unhide', 'delete', 'pin', 'unpin', 'lock', 'unlock') then
    raise exception 'invalid action: %', p_action using errcode = '22023';
  end if;
  if p_action in ('hide', 'delete') and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  update public.topics
  set status    = case p_action when 'hide'   then 'hidden'::public.content_status
                                when 'delete' then 'deleted'::public.content_status
                                when 'unhide' then 'published'::public.content_status
                                else status end,
      is_pinned = case p_action when 'pin' then true when 'unpin' then false else is_pinned end,
      is_locked = case p_action when 'lock' then true when 'unlock' then false else is_locked end
  where id = p_topic_id;

  if not found then
    raise exception 'topic not found' using errcode = 'P0002';
  end if;

  perform public.write_audit_log('topic.' || p_action, 'topic', p_topic_id,
                                 jsonb_build_object('reason', p_reason));
end;
$$;

create function public.moderate_post(p_post_id uuid, p_action text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_action not in ('hide', 'unhide', 'delete') then
    raise exception 'invalid action: %', p_action using errcode = '22023';
  end if;
  if p_action in ('hide', 'delete') and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  update public.posts
  set status = case p_action when 'hide'   then 'hidden'::public.content_status
                             when 'delete' then 'deleted'::public.content_status
                             else 'published'::public.content_status end
  where id = p_post_id;

  if not found then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  perform public.write_audit_log('post.' || p_action, 'post', p_post_id,
                                 jsonb_build_object('reason', p_reason));
end;
$$;

-- ---- Reports ----------------------------------------------------------------
create function public.resolve_report(
  p_report_id uuid,
  p_status    public.report_status,
  p_note      text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status = 'open' then
    raise exception 'invalid status: %', p_status using errcode = '22023';
  end if;

  update public.reports
  set status          = p_status,
      handled_by      = auth.uid(),
      handled_at      = case when p_status in ('resolved', 'dismissed') then now() else null end,
      resolution_note = left(p_note, 1000)
  where id = p_report_id;

  if not found then
    raise exception 'report not found' using errcode = 'P0002';
  end if;

  perform public.write_audit_log('report.' || p_status::text, 'report', p_report_id,
                                 jsonb_build_object('note', p_note));
end;
$$;

-- ---- Accepted solution ------------------------------------------------------
-- Topic author (when unlocked) or a moderator marks / clears the accepted answer.
create function public.set_accepted_post(p_topic_id uuid, p_post_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_topic_author uuid;
  v_topic_status public.content_status;
  v_topic_locked boolean;
  v_post_author  uuid;
  v_is_mod       boolean := public.is_moderator();
begin
  if not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select author_id, status, is_locked
    into v_topic_author, v_topic_status, v_topic_locked
  from public.topics where id = p_topic_id for update;
  if not found then
    raise exception 'topic not found' using errcode = 'P0002';
  end if;
  if v_topic_status <> 'published' then
    raise exception 'topic is not published' using errcode = '22023';
  end if;
  if not (v_is_mod or v_topic_author = auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_topic_locked and not v_is_mod then
    raise exception 'topic is locked' using errcode = '22023';
  end if;

  if p_post_id is not null then
    select author_id into v_post_author
    from public.posts
    where id = p_post_id and topic_id = p_topic_id and status = 'published';
    if not found then
      raise exception 'post does not belong to this topic or is not published' using errcode = '22023';
    end if;
  end if;

  update public.topics set accepted_post_id = p_post_id where id = p_topic_id;

  if p_post_id is not null and v_post_author is not null and v_post_author <> auth.uid() then
    insert into public.notifications (user_id, type, actor_id, topic_id, post_id)
    values (v_post_author, 'solution_accepted', auth.uid(), p_topic_id, p_post_id);
  end if;

  if v_is_mod and v_topic_author is distinct from auth.uid() then
    perform public.write_audit_log('topic.accepted_post_changed', 'topic', p_topic_id,
                                   jsonb_build_object('post_id', p_post_id));
  end if;
end;
$$;
