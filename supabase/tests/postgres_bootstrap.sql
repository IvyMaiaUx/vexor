-- =============================================================================
-- Migration 00 — Standalone PostgreSQL 15+ Bootstrap (Supabase Compatibility)
--
-- Purpose:
--   Allows running the entire migration suite + RLS smoke tests on a standard
--   local PostgreSQL 15+ installation without Docker/Supabase CLI, while
--   remaining 100% idempotent if executed on Supabase.
-- =============================================================================

-- 1. Schemas expected by Supabase migrations
create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;

-- 2. Database roles used by RLS policies and GRANTs
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
end
$$;

grant usage on schema public, extensions, auth, storage to anon, authenticated;

-- 3. Minimal auth.users table and auth.uid() / auth.role() helpers
create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  encrypted_password text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(pg_catalog.current_setting('request.jwt.claim.sub', true), ''),
    (nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(pg_catalog.current_setting('request.jwt.claim.role', true), ''),
    (nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    current_user::text
  );
$$;

grant execute on function auth.uid(), auth.role() to anon, authenticated;

-- 4. Minimal storage schema (buckets, objects, foldername helper)
create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null unique,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists storage.objects (
  id          uuid primary key default gen_random_uuid(),
  bucket_id   text not null references storage.buckets (id) on delete cascade,
  name        text not null,
  owner       uuid default auth.uid(),
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (bucket_id, name)
);

alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;

grant select on storage.buckets, storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select pg_catalog.string_to_array(name, '/');
$$;

grant execute on function storage.foldername(text) to anon, authenticated;
