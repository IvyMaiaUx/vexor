-- =============================================================================
-- VEXOR — Content Policy attribute on public.resources ('standard' | 'reduced')
-- Migration: 20261123000000_resource_content_policy.sql
-- =============================================================================

begin;

-- 1. Dedicated enum (no generic resource tags)
do $$
begin
  if not exists (
    select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public'
       and t.typname = 'resource_content_policy'
  ) then
    create type public.resource_content_policy as enum ('standard', 'reduced');
  end if;
end $$;

-- 2. Column on public.resources + partial index for catalog filtering
alter table public.resources
  add column if not exists content_policy public.resource_content_policy not null default 'standard';

create index if not exists resources_content_policy_reduced_idx
  on public.resources (content_policy)
  where status = 'approved' and content_policy = 'reduced';

-- 3. Column-level GRANTs: read-only for anon & authenticated; write BLOCKED for clients
grant select (content_policy) on public.resources to anon, authenticated;

-- 4. Extend moderate_resource() with optional p_content_policy (backwards-compatible default null)
drop function if exists public.moderate_resource(uuid, public.resource_status, text);

create or replace function public.moderate_resource(
  p_resource_id    uuid,
  p_decision       public.resource_status,
  p_reason         text default null,
  p_content_policy public.resource_content_policy default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submitter   uuid;
  v_prev_policy public.resource_content_policy;
  v_caller_role public.user_role;
  v_caller_susp boolean;
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

  select r.submitted_by, r.content_policy
    into v_submitter, v_prev_policy
    from public.resources r
   where r.id = p_resource_id
     for update;

  if not found then
    raise exception 'resource not found' using errcode = 'P0002';
  end if;

  select p.role, p.is_suspended
    into v_caller_role, v_caller_susp
    from public.profiles p
   where p.id = auth.uid()
     for share nowait;

  if not found or v_caller_susp or v_caller_role not in ('moderator', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.resources r
     set status           = p_decision,
         reviewed_by      = auth.uid(),
         reviewed_at      = now(),
         rejection_reason = case when p_decision = 'rejected' then p_reason else null end,
         published_at     = case when p_decision = 'approved' then coalesce(r.published_at, now())
                                 else r.published_at end,
         content_policy   = coalesce(p_content_policy, r.content_policy)
   where r.id = p_resource_id;

  perform public.write_audit_log(
    'resource.' || p_decision::text,
    'resource',
    p_resource_id,
    jsonb_build_object(
      'reason', p_reason,
      'content_policy', coalesce(p_content_policy, v_prev_policy)
    )
  );

  if p_decision in ('approved', 'rejected')
     and v_submitter is not null and v_submitter <> auth.uid() then
    insert into public.notifications (user_id, type, actor_id, resource_id)
    values (
      v_submitter,
      case when p_decision = 'approved' then 'resource_approved'::public.notification_type
           else 'resource_rejected'::public.notification_type end,
      auth.uid(),
      p_resource_id
    );
  end if;
end;
$$;

-- 5. Dedicated RPC for admin/mod to update content_policy on existing resources
create or replace function public.set_resource_content_policy(
  p_resource_id    uuid,
  p_content_policy public.resource_content_policy,
  p_reason         text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prev_policy public.resource_content_policy;
  v_caller_role public.user_role;
  v_caller_susp boolean;
begin
  if not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_content_policy is null then
    raise exception 'content_policy is required' using errcode = '22023';
  end if;

  select r.content_policy
    into v_prev_policy
    from public.resources r
   where r.id = p_resource_id
     for update;

  if not found then
    raise exception 'resource not found' using errcode = 'P0002';
  end if;

  select p.role, p.is_suspended
    into v_caller_role, v_caller_susp
    from public.profiles p
   where p.id = auth.uid()
     for share nowait;

  if not found or v_caller_susp or v_caller_role not in ('moderator', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.resources
     set content_policy = p_content_policy
   where id = p_resource_id;

  perform public.write_audit_log(
    'resource.content_policy_updated',
    'resource',
    p_resource_id,
    jsonb_build_object(
      'from', v_prev_policy,
      'to', p_content_policy,
      'reason', nullif(btrim(coalesce(p_reason, '')), '')
    )
  );
end;
$$;

revoke all on function public.moderate_resource(uuid, public.resource_status, text, public.resource_content_policy) from public, anon;
grant execute on function public.moderate_resource(uuid, public.resource_status, text, public.resource_content_policy) to authenticated;

revoke all on function public.set_resource_content_policy(uuid, public.resource_content_policy, text) from public, anon;
grant execute on function public.set_resource_content_policy(uuid, public.resource_content_policy, text) to authenticated;

commit;
