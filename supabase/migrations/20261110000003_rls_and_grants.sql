-- =============================================================================
-- Migration 03 — Privileges, Row Level Security and Storage
--
-- Two layers of defense:
--   1. GRANTs (column level): what a client may even attempt to write.
--      Sensitive columns (role, status, reviewed_by, vote_count, ...) are never
--      granted, so no policy mistake can expose them.
--   2. RLS policies: which rows a client may read/write.
--
-- Baseline is deny-all. Everything below is an explicit allow.
-- In policies, auth.uid() and the helper functions are wrapped in
-- `(select ...)` so Postgres evaluates them once per statement, not per row.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Baseline: remove Supabase's default broad grants
-- -----------------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

alter table public.profiles      enable row level security;
alter table public.categories    enable row level security;
alter table public.resources     enable row level security;
alter table public.topics        enable row level security;
alter table public.posts         enable row level security;
alter table public.tags          enable row level security;
alter table public.topic_tags    enable row level security;
alter table public.votes         enable row level security;
alter table public.bookmarks     enable row level security;
alter table public.reports       enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs    enable row level security;

-- -----------------------------------------------------------------------------
-- Function privileges
-- -----------------------------------------------------------------------------
-- Helpers are evaluated inside policies and index expressions for anon too.
grant execute on function
  public.current_user_role(), public.is_active_member(),
  public.is_moderator(), public.is_admin(), public.topic_has_replies(uuid),
  public.normalize_resource_url(text)
to anon, authenticated;

-- Internal / trigger functions: not callable by clients at all.
revoke all on function public.write_audit_log(text, text, uuid, jsonb)      from public, anon, authenticated;
revoke all on function public.on_category_changed()                         from public, anon, authenticated;
revoke all on function public.handle_new_user()                             from public, anon, authenticated;
revoke all on function public.on_post_created()                             from public, anon, authenticated;
revoke all on function public.on_vote_changed()                             from public, anon, authenticated;
revoke all on function public.resources_set_slug()                          from public, anon, authenticated;
revoke all on function public.topic_tags_limit()                            from public, anon, authenticated;
revoke all on function public.audit_logs_block_mutation()                   from public, anon, authenticated;
revoke all on function public.set_updated_at()                              from public, anon, authenticated;

-- Public RPCs: authenticated only (each function re-checks the role itself).
revoke all on function public.admin_set_user_role(uuid, public.user_role)                    from public, anon;
revoke all on function public.admin_set_user_suspension(uuid, boolean, text)                 from public, anon;
revoke all on function public.moderate_resource(uuid, public.resource_status, text)          from public, anon;
revoke all on function public.resubmit_resource(uuid)                                        from public, anon;
revoke all on function public.moderate_topic(uuid, text, text)                               from public, anon;
revoke all on function public.moderate_post(uuid, text, text)                                from public, anon;
revoke all on function public.resolve_report(uuid, public.report_status, text)               from public, anon;
revoke all on function public.set_accepted_post(uuid, uuid)                                  from public, anon;

grant execute on function public.admin_set_user_role(uuid, public.user_role)                 to authenticated;
grant execute on function public.admin_set_user_suspension(uuid, boolean, text)              to authenticated;
grant execute on function public.moderate_resource(uuid, public.resource_status, text)       to authenticated;
grant execute on function public.resubmit_resource(uuid)                                     to authenticated;
grant execute on function public.moderate_topic(uuid, text, text)                            to authenticated;
grant execute on function public.moderate_post(uuid, text, text)                             to authenticated;
grant execute on function public.resolve_report(uuid, public.report_status, text)            to authenticated;
grant execute on function public.set_accepted_post(uuid, uuid)                               to authenticated;

-- -----------------------------------------------------------------------------
-- Table grants (column level for writes)
-- -----------------------------------------------------------------------------
grant select on public.profiles, public.categories, public.resources, public.topics,
                public.posts, public.tags, public.topic_tags
  to anon, authenticated;
grant select on public.votes, public.bookmarks, public.reports,
                public.notifications, public.audit_logs
  to authenticated;

-- profiles: no INSERT (trigger), no DELETE (cascade from auth.users); role/is_suspended excluded.
grant update (username, display_name, avatar_url, bio, interests,
              github_url, linkedin_url, preferred_locale)
  on public.profiles to authenticated;

-- categories: admin-only via policies
grant insert, update, delete on public.categories to authenticated;

-- resources: status, slug, reviewed_*, published_at, submitted_by are NOT client-writable.
grant insert (name, description, category_id, type, url, language, difficulty, author_name)
  on public.resources to authenticated;
grant update (name, description, category_id, type, url, language, difficulty, author_name)
  on public.resources to authenticated;
grant delete on public.resources to authenticated;

-- forum
grant insert (category_id, title, body) on public.topics to authenticated;
grant update (category_id, title, body) on public.topics to authenticated;
grant delete on public.topics to authenticated;

grant insert (topic_id, body) on public.posts to authenticated;
grant update (body)           on public.posts to authenticated;
grant delete                  on public.posts to authenticated;

grant insert (slug, name) on public.tags to authenticated;
grant update (name)       on public.tags to authenticated;
grant delete              on public.tags to authenticated;

grant insert (topic_id, tag_id) on public.topic_tags to authenticated;
grant delete                    on public.topic_tags to authenticated;

grant insert (post_id)     on public.votes     to authenticated;
grant delete               on public.votes     to authenticated;
grant insert (resource_id) on public.bookmarks to authenticated;
grant delete               on public.bookmarks to authenticated;

grant insert (topic_id, post_id, resource_id, profile_id, reason, details)
  on public.reports to authenticated;

grant update (read_at) on public.notifications to authenticated;
grant delete           on public.notifications to authenticated;

-- =============================================================================
-- Policies
-- =============================================================================

-- ---- profiles ---------------------------------------------------------------
create policy profiles_select_public on public.profiles
  for select to anon, authenticated
  using (true);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using      (id = (select auth.uid()) and (select public.is_active_member()))
  with check (id = (select auth.uid()) and (select public.is_active_member()));

-- ---- categories -------------------------------------------------------------
create policy categories_select on public.categories
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy categories_insert_admin on public.categories
  for insert to authenticated
  with check ((select public.is_admin()));

create policy categories_update_admin on public.categories
  for update to authenticated
  using      ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy categories_delete_admin on public.categories
  for delete to authenticated
  using ((select public.is_admin()));

-- ---- resources --------------------------------------------------------------
create policy resources_select on public.resources
  for select to anon, authenticated
  using (
    status = 'approved'
    or submitted_by = (select auth.uid())
    or (select public.is_moderator())
  );

create policy resources_insert_member on public.resources
  for insert to authenticated
  with check (
    (select public.is_active_member())
    and submitted_by = (select auth.uid())
    and status = 'pending'
    and exists (select 1 from public.categories c
                where c.id = resources.category_id and c.is_active and c.scope in ('resource', 'both'))
  );

-- Owners may edit only while the resource is pending/rejected. After approval
-- the URL is frozen for them (prevents approve-then-swap-to-malicious-link).
create policy resources_update_owner on public.resources
  for update to authenticated
  using (
    submitted_by = (select auth.uid())
    and status in ('pending', 'rejected')
    and (select public.is_active_member())
  )
  with check (
    submitted_by = (select auth.uid())
    and status in ('pending', 'rejected')
    and (select public.is_active_member())
  );

create policy resources_update_moderator on public.resources
  for update to authenticated
  using      ((select public.is_moderator()))
  with check ((select public.is_moderator()));

create policy resources_delete_owner_pending on public.resources
  for delete to authenticated
  using (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and (select public.is_active_member())
  );

create policy resources_delete_admin on public.resources
  for delete to authenticated
  using ((select public.is_admin()));

-- ---- topics -----------------------------------------------------------------
create policy topics_select on public.topics
  for select to anon, authenticated
  using (
    status = 'published'
    or author_id = (select auth.uid())
    or (select public.is_moderator())
  );

create policy topics_insert_member on public.topics
  for insert to authenticated
  with check (
    (select public.is_active_member())
    and author_id = (select auth.uid())
    and status = 'published'
    and exists (select 1 from public.categories c
                where c.id = topics.category_id and c.is_active and c.scope in ('forum', 'both'))
  );

create policy topics_update_owner on public.topics
  for update to authenticated
  using (
    author_id = (select auth.uid())
    and status = 'published'
    and not is_locked
    and (select public.is_active_member())
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

-- Authors can delete their own topic only while nobody replied and it is unlocked.
create policy topics_delete_owner_unanswered on public.topics
  for delete to authenticated
  using (
    author_id = (select auth.uid())
    and status = 'published'
    and not is_locked
    and (select public.is_active_member())
    and not public.topic_has_replies(topics.id)
  );

create policy topics_delete_admin on public.topics
  for delete to authenticated
  using ((select public.is_admin()));

-- ---- posts ------------------------------------------------------------------
-- A published reply is visible only if its topic is visible too.
create policy posts_select on public.posts
  for select to anon, authenticated
  using (
    (status = 'published'
      and exists (select 1 from public.topics t where t.id = posts.topic_id))
    or author_id = (select auth.uid())
    or (select public.is_moderator())
  );

create policy posts_insert_member on public.posts
  for insert to authenticated
  with check (
    (select public.is_active_member())
    and author_id = (select auth.uid())
    and status = 'published'
    and exists (select 1 from public.topics t
                where t.id = posts.topic_id
                  and t.status = 'published'
                  and (not t.is_locked or (select public.is_moderator())))
  );

-- Reply authors may edit/delete their own reply only while the parent topic is
-- published and unlocked (moderators/admins bypass the topic lock).
create policy posts_update_owner on public.posts
  for update to authenticated
  using (
    author_id = (select auth.uid())
    and status = 'published'
    and (select public.is_active_member())
    and exists (select 1 from public.topics t
                where t.id = posts.topic_id
                  and t.status = 'published'
                  and (not t.is_locked or (select public.is_moderator())))
  )
  with check (
    author_id = (select auth.uid())
    and status = 'published'
    and (select public.is_active_member())
    and exists (select 1 from public.topics t
                where t.id = posts.topic_id
                  and t.status = 'published'
                  and (not t.is_locked or (select public.is_moderator())))
  );

create policy posts_delete_owner on public.posts
  for delete to authenticated
  using (
    author_id = (select auth.uid())
    and status = 'published'
    and (select public.is_active_member())
    and exists (select 1 from public.topics t
                where t.id = posts.topic_id
                  and t.status = 'published'
                  and (not t.is_locked or (select public.is_moderator())))
  );

create policy posts_delete_admin on public.posts
  for delete to authenticated
  using ((select public.is_admin()));

-- ---- tags / topic_tags ------------------------------------------------------
create policy tags_select on public.tags
  for select to anon, authenticated
  using (true);

create policy tags_insert_member on public.tags
  for insert to authenticated
  with check ((select public.is_active_member()));

create policy tags_update_moderator on public.tags
  for update to authenticated
  using      ((select public.is_moderator()))
  with check ((select public.is_moderator()));

create policy tags_delete_moderator on public.tags
  for delete to authenticated
  using ((select public.is_moderator()));

create policy topic_tags_select on public.topic_tags
  for select to anon, authenticated
  using (exists (select 1 from public.topics t where t.id = topic_tags.topic_id));

create policy topic_tags_insert on public.topic_tags
  for insert to authenticated
  with check (
    (select public.is_active_member())
    and exists (select 1 from public.topics t
                where t.id = topic_tags.topic_id
                  and (
                    (t.author_id = (select auth.uid()) and t.status = 'published' and not t.is_locked)
                    or (select public.is_moderator())
                  ))
  );

create policy topic_tags_delete on public.topic_tags
  for delete to authenticated
  using (
    (select public.is_active_member())
    and exists (select 1 from public.topics t
                where t.id = topic_tags.topic_id
                  and (
                    (t.author_id = (select auth.uid()) and t.status = 'published' and not t.is_locked)
                    or (select public.is_moderator())
                  ))
  );

-- ---- votes ------------------------------------------------------------------
create policy votes_select_own on public.votes
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy votes_insert on public.votes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_active_member())
    and exists (select 1 from public.posts p
                where p.id = votes.post_id
                  and p.status = 'published'
                  and p.author_id is distinct from (select auth.uid()))
  );

create policy votes_delete_own on public.votes
  for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_member()));

-- ---- bookmarks --------------------------------------------------------------
create policy bookmarks_select_own on public.bookmarks
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy bookmarks_insert on public.bookmarks
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_active_member())
    and exists (select 1 from public.resources r
                where r.id = bookmarks.resource_id and r.status = 'approved')
  );

create policy bookmarks_delete_own on public.bookmarks
  for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_member()));

-- ---- reports ----------------------------------------------------------------
create policy reports_select on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_moderator()));

create policy reports_insert on public.reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (select public.is_active_member())
    and status = 'open'
  );

-- ---- notifications ----------------------------------------------------------
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using      (user_id = (select auth.uid()) and (select public.is_active_member()))
  with check (user_id = (select auth.uid()) and (select public.is_active_member()));

create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_member()));

-- ---- audit_logs -------------------------------------------------------------
create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated
  using ((select public.is_admin()));

-- =============================================================================
-- Storage: avatars bucket (public read, active-member owner-only write)
-- SVG is intentionally not allowed (script injection vector).
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_active_member())
  );

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_active_member())
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_active_member())
  );

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_active_member())
  );
