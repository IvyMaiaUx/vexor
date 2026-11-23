-- =============================================================================
-- VEXOR — Secure Login by @username
-- Migration: 20261123110000_username_login_rpc.sql
--
-- Resolves auth.users.email from public.profiles.username ONLY when the supplied
-- password matches auth.users.encrypted_password (bcrypt via pgcrypto).
-- Never discloses whether a username exists or leaks emails on wrong password.
-- =============================================================================

begin;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.resolve_login_email_by_username(
  p_username text,
  p_password text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean text;
  v_email text;
  v_hash  text;
begin
  if p_username is null or p_password is null or char_length(p_password) < 8 then
    return null;
  end if;

  v_clean := lower(regexp_replace(btrim(p_username), '^@+', ''));
  if v_clean !~ '^[a-z0-9_]{3,30}$' then
    return null;
  end if;

  select u.email, u.encrypted_password
    into v_email, v_hash
    from public.profiles p
    join auth.users u on u.id = p.id
   where lower(p.username) = v_clean
   limit 1;

  if not found or v_email is null or v_hash is null or v_hash = '' then
    return null;
  end if;

  if extensions.crypt(p_password, v_hash) = v_hash then
    return v_email;
  end if;

  return null;
end;
$$;

revoke all on function public.resolve_login_email_by_username(text, text) from public;
grant execute on function public.resolve_login_email_by_username(text, text) to anon, authenticated;

commit;
