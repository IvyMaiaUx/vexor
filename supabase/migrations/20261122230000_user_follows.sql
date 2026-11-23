-- =============================================================================
-- VEXOR — User Follows (Seguidores / Seguindo)
-- Migration: 20261122230000_user_follows.sql
--
-- Enforces at the database level:
--   - No self-following (follower_id <> following_id)
--   - Column-level INSERT grant on (following_id) only so follower_id = auth.uid()
--   - Cannot follow suspended users or users with a mutual block
--   - Suspended users cannot follow or unfollow
-- =============================================================================

begin;

create table if not exists public.user_follows (
  follower_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_not_self check (follower_id <> following_id)
);

create index if not exists user_follows_following_idx
  on public.user_follows (following_id, created_at desc);

create index if not exists user_follows_follower_idx
  on public.user_follows (follower_id, created_at desc);

alter table public.user_follows enable row level security;

revoke all on public.user_follows from anon, authenticated;
grant select, delete on public.user_follows to authenticated;
grant insert (following_id) on public.user_follows to authenticated;

drop policy if exists user_follows_select_authenticated on public.user_follows;
create policy user_follows_select_authenticated on public.user_follows
  for select to authenticated
  using (true);

drop policy if exists user_follows_insert_own on public.user_follows;
create policy user_follows_insert_own on public.user_follows
  for insert to authenticated
  with check (
    (select public.is_active_member())
    and follower_id = (select auth.uid())
    and following_id <> (select auth.uid())
    and exists (
      select 1 from public.profiles p
       where p.id = following_id
         and not p.is_suspended
    )
    and not exists (
      select 1 from public.user_blocks b
       where (b.blocker_id = follower_id and b.blocked_id = following_id)
          or (b.blocker_id = following_id and b.blocked_id = follower_id)
    )
  );

drop policy if exists user_follows_delete_own on public.user_follows;
create policy user_follows_delete_own on public.user_follows
  for delete to authenticated
  using (
    follower_id = (select auth.uid())
    and (select public.is_active_member())
  );

commit;
