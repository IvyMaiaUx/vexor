-- =============================================================================
-- VEXOR — LOCAL MIGRATION FOR REVIEW (DO NOT APPLY REMOTELY WITHOUT APPROVAL)
-- Adds SECURITY DEFINER RPCs for direct_conversation_members (archive/mute)
-- and direct_messages (edit own published message within edit window),
-- preserving strict RLS and participant/suspension checks.
-- =============================================================================

begin;

create or replace function public.set_dm_conversation_archive(
  p_conversation_id uuid,
  p_archived        boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id   uuid := auth.uid();
  v_caller_susp boolean;
begin
  if v_caller_id is null or p_conversation_id is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select is_suspended into v_caller_susp
    from public.profiles
   where id = v_caller_id;

  if coalesce(v_caller_susp, true) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  if not public.is_dm_participant(p_conversation_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.direct_conversation_members
     set is_archived = coalesce(p_archived, false)
   where conversation_id = p_conversation_id
     and user_id = v_caller_id;

  return coalesce(p_archived, false);
end;
$$;

create or replace function public.set_dm_conversation_mute(
  p_conversation_id uuid,
  p_muted_until     timestamptz default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id   uuid := auth.uid();
  v_caller_susp boolean;
begin
  if v_caller_id is null or p_conversation_id is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select is_suspended into v_caller_susp
    from public.profiles
   where id = v_caller_id;

  if coalesce(v_caller_susp, true) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  if not public.is_dm_participant(p_conversation_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.direct_conversation_members
     set muted_until = p_muted_until
   where conversation_id = p_conversation_id
     and user_id = v_caller_id;

  return p_muted_until;
end;
$$;

create or replace function public.edit_direct_message(
  p_message_id uuid,
  p_body       text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id   uuid := auth.uid();
  v_caller_susp boolean;
  v_msg         record;
  v_trimmed     text;
  v_edited_at   timestamptz := now();
begin
  if v_caller_id is null or p_message_id is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select is_suspended into v_caller_susp
    from public.profiles
   where id = v_caller_id;

  if coalesce(v_caller_susp, true) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  v_trimmed := pg_catalog.btrim(coalesce(p_body, ''));
  if pg_catalog.char_length(v_trimmed) < 1 or pg_catalog.char_length(v_trimmed) > 4000 then
    raise exception 'invalid_body_length' using errcode = '22023';
  end if;

  select id, conversation_id, sender_id, status
    into v_msg
    from public.direct_messages
   where id = p_message_id;

  if not found or v_msg.status <> 'published' then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_msg.sender_id is distinct from v_caller_id
     or not public.is_dm_participant(v_msg.conversation_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.direct_messages
     set body = v_trimmed,
         edited_at = v_edited_at
   where id = p_message_id;

  return v_edited_at;
end;
$$;

revoke all on function public.set_dm_conversation_archive(uuid, boolean) from public, anon;
revoke all on function public.set_dm_conversation_mute(uuid, timestamptz) from public, anon;
revoke all on function public.edit_direct_message(uuid, text) from public, anon;

grant execute on function public.set_dm_conversation_archive(uuid, boolean) to authenticated;
grant execute on function public.set_dm_conversation_mute(uuid, timestamptz) to authenticated;
grant execute on function public.edit_direct_message(uuid, text) to authenticated;

commit;
