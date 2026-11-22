-- =============================================================================
-- VEXOR — Allow Self-Messaging (Saved Messages / Notes to Self)
-- Allows a member to open a 1:1 DM conversation with themselves
-- (participant_low = participant_high = auth.uid()), while preserving
-- pair uniqueness, suspension checks, and RLS isolation.
-- =============================================================================

begin;

alter table public.direct_conversations
  drop constraint if exists direct_conversations_pair_order;

alter table public.direct_conversations
  add constraint direct_conversations_pair_order
  check (participant_low <= participant_high);

create or replace function public.get_or_create_dm_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id   uuid := auth.uid();
  v_caller_susp boolean;
  v_other_susp  boolean;
  v_low         uuid;
  v_high        uuid;
  v_conv_id     uuid;
begin
  if v_caller_id is null or p_other_user_id is null then
    raise exception 'invalid conversation target' using errcode = '22023';
  end if;

  v_low  := least(v_caller_id, p_other_user_id);
  v_high := greatest(v_caller_id, p_other_user_id);
  perform pg_advisory_xact_lock(hashtextextended('dm:' || v_low::text || ':' || v_high::text, 0));

  select is_suspended into v_caller_susp
    from public.profiles where id = v_caller_id for share nowait;
  if not found or v_caller_susp then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_other_user_id <> v_caller_id then
    select is_suspended into v_other_susp
      from public.profiles where id = p_other_user_id for share nowait;
    if not found or v_other_susp then
      raise exception 'conversation unavailable' using errcode = '42501';
    end if;

    if exists (
      select 1 from public.user_blocks b
       where (b.blocker_id = v_caller_id and b.blocked_id = p_other_user_id)
          or (b.blocker_id = p_other_user_id and b.blocked_id = v_caller_id)
    ) then
      raise exception 'conversation unavailable' using errcode = '42501';
    end if;
  end if;

  insert into public.direct_conversations (participant_low, participant_high)
  values (v_low, v_high)
  on conflict (participant_low, participant_high) do nothing;

  select id into v_conv_id
    from public.direct_conversations
   where participant_low = v_low and participant_high = v_high;

  if v_low = v_high then
    insert into public.direct_conversation_members (conversation_id, user_id)
    values (v_conv_id, v_low)
    on conflict (conversation_id, user_id) do nothing;
  else
    insert into public.direct_conversation_members (conversation_id, user_id)
    values (v_conv_id, v_low), (v_conv_id, v_high)
    on conflict (conversation_id, user_id) do nothing;
  end if;

  return v_conv_id;
end;
$$;

revoke all on function public.get_or_create_dm_conversation(uuid) from public;
grant execute on function public.get_or_create_dm_conversation(uuid) to authenticated;

commit;
