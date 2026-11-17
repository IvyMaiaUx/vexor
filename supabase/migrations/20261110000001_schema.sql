-- =============================================================================
-- Migration 01 — Schema: extensions, enums, tables, constraints, indexes
-- Target: Supabase (PostgreSQL 15+). Requires `ON DELETE SET NULL (column)`.
--
-- Conventions
--   * All timestamps are timestamptz, UTC.
--   * Primary keys are uuid (gen_random_uuid()) except audit_logs (bigint).
--   * Ownership columns default to auth.uid(); clients never send them.
--   * Content tables are soft-moderated through a `status` column.
--   * User-authored rows keep existing when the author deletes their account
--     (author_id -> NULL) so discussions are not destroyed.
-- =============================================================================

create extension if not exists pg_trgm  with schema extensions;
create extension if not exists unaccent with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.user_role         as enum ('member', 'moderator', 'admin');
create type public.category_scope    as enum ('resource', 'forum', 'both');
create type public.resource_type     as enum ('tool', 'repository', 'script', 'framework',
                                              'documentation', 'lab', 'ctf_platform',
                                              'course', 'article');
create type public.difficulty_level  as enum ('beginner', 'intermediate', 'advanced');
create type public.resource_status   as enum ('pending', 'approved', 'rejected', 'archived');
create type public.content_status    as enum ('published', 'hidden', 'deleted');
create type public.report_status     as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.report_reason     as enum ('spam', 'malicious_content', 'personal_data',
                                              'harassment', 'unauthorized_attack',
                                              'copyright', 'other');
create type public.notification_type as enum ('topic_reply', 'solution_accepted',
                                              'resource_approved', 'resource_rejected');

-- -----------------------------------------------------------------------------
-- profiles  (1:1 with auth.users; created by trigger, never by the client)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  username         text        not null,
  display_name     text,
  avatar_url       text,
  bio              text,
  interests        text[]      not null default '{}',
  github_url       text,
  linkedin_url     text,
  preferred_locale text        not null default 'en',
  role             public.user_role not null default 'member',
  is_suspended     boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint profiles_username_format  check (username ~ '^[a-z0-9_]{3,30}$'),
  constraint profiles_display_name_len check (display_name is null or char_length(display_name) between 1 and 60),
  constraint profiles_bio_len          check (bio is null or char_length(bio) <= 500),
  constraint profiles_interests_max    check (cardinality(interests) <= 10),
  constraint profiles_avatar_https     check (avatar_url is null or avatar_url ~ '^https://'),
  constraint profiles_github_url       check (github_url is null or github_url ~ '^https://(www\.)?github\.com/[A-Za-z0-9._-]+/?$'),
  constraint profiles_linkedin_url     check (linkedin_url is null or linkedin_url ~ '^https://([a-z]{2,3}\.)?linkedin\.com/(in|company)/[A-Za-z0-9._%-]+/?$'),
  constraint profiles_locale           check (preferred_locale in ('pt-BR', 'en'))
);
create unique index profiles_username_key on public.profiles (username);
create index profiles_role_idx on public.profiles (role) where role <> 'member';

comment on table  public.profiles      is 'Public member profile. Email lives only in auth.users.';
comment on column public.profiles.role is 'Never writable by clients. Changed only via admin_set_user_role().';

-- -----------------------------------------------------------------------------
-- categories  (shared by catalog and forum; bilingual labels)
-- -----------------------------------------------------------------------------
create table public.categories (
  id             uuid primary key default gen_random_uuid(),
  slug           text        not null unique,
  name_en        text        not null,
  name_pt        text        not null,
  description_en text,
  description_pt text,
  scope          public.category_scope not null default 'both',
  sort_order     integer     not null default 0,
  is_active      boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

comment on table public.categories is 'Categories are deactivated (is_active=false), not deleted, once in use.';

-- -----------------------------------------------------------------------------
-- URL normalization helper (RFC 3986 safe: lowercases scheme + host, strips
-- default ports :80/:443 and root-only trailing slash, while preserving
-- case-sensitive path, query and fragment).
-- -----------------------------------------------------------------------------
create function public.normalize_resource_url(p_url text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select coalesce(
    (
      select
        lower(m[1]) || '://' ||
        case
          when lower(m[1]) = 'http'  and m[3] = ':80'  then lower(m[2])
          when lower(m[1]) = 'https' and m[3] = ':443' then lower(m[2])
          else lower(m[2]) || coalesce(m[3], '')
        end ||
        case
          when m[4] = '' or m[4] = '/' then ''
          else m[4]
        end
      from pg_catalog.regexp_match(
        pg_catalog.btrim(p_url),
        '^([A-Za-z][A-Za-z0-9+.-]*)://([^/:?#]+)(:[0-9]+)?(.*)$'
      ) as m
    ),
    pg_catalog.btrim(p_url)
  );
$$;

-- -----------------------------------------------------------------------------
-- resources  (catalog)
-- -----------------------------------------------------------------------------
create table public.resources (
  id               uuid primary key default gen_random_uuid(),
  slug             text        not null unique,
  name             text        not null,
  description      text        not null,
  category_id      uuid        not null references public.categories (id) on delete restrict,
  type             public.resource_type not null,
  url              text        not null,
  language         text        not null default 'en',
  difficulty       public.difficulty_level,
  author_name      text,
  submitted_by     uuid        default auth.uid() references public.profiles (id) on delete set null,
  status           public.resource_status not null default 'pending',
  reviewed_by      uuid        references public.profiles (id) on delete set null,
  reviewed_at      timestamptz,
  rejection_reason text,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  search_vector tsvector generated always as (
    to_tsvector('simple'::regconfig, coalesce(name, '') || ' ' || coalesce(description, ''))
  ) stored,

  constraint resources_name_len     check (char_length(name) between 2 and 120),
  constraint resources_desc_len     check (char_length(description) between 10 and 2000),
  constraint resources_url_scheme   check (url ~* '^https?://[^[:space:]]+$' and char_length(url) <= 2048),
  constraint resources_language     check (language in ('en', 'pt-BR', 'multilingual', 'other')),
  constraint resources_author_len   check (author_name is null or char_length(author_name) <= 120),
  constraint resources_reject_reason check (status <> 'rejected' or rejection_reason is not null)
);

-- Search: full-text (name + description) and trigram (partial name match)
create index resources_search_idx on public.resources using gin (search_vector);
create index resources_name_trgm  on public.resources using gin (name extensions.gin_trgm_ops);
-- Catalog filters always include status = 'approved'
create index resources_category_idx   on public.resources (category_id, published_at desc) where status = 'approved';
create index resources_type_idx       on public.resources (type, published_at desc)        where status = 'approved';
create index resources_difficulty_idx on public.resources (difficulty)                     where status = 'approved';
create index resources_published_idx  on public.resources (published_at desc)              where status = 'approved';
-- Moderation queue and "my contributions"
create index resources_pending_idx    on public.resources (created_at)                     where status = 'pending';
create index resources_submitter_idx  on public.resources (submitted_by, created_at desc);
-- Duplicate prevention (normalized scheme/host, preserving path/query case and non-root paths)
create unique index resources_url_active_key on public.resources (public.normalize_resource_url(url))
  where status in ('pending', 'approved');

comment on column public.resources.published_at is '"Data de inclusão": set when first approved.';

-- -----------------------------------------------------------------------------
-- topics / posts  (forum)
-- -----------------------------------------------------------------------------
create table public.topics (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid        default auth.uid() references public.profiles (id) on delete set null,
  category_id      uuid        not null references public.categories (id) on delete restrict,
  title            text        not null,
  body             text        not null,
  status           public.content_status not null default 'published',
  is_pinned        boolean     not null default false,
  is_locked        boolean     not null default false,
  accepted_post_id uuid,
  last_activity_at timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  search_vector tsvector generated always as (
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(body, '')),  'B')
  ) stored,

  constraint topics_title_len check (char_length(title) between 5 and 200),
  constraint topics_body_len  check (char_length(body)  between 10 and 20000)
);

create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid        not null references public.topics (id) on delete cascade,
  author_id   uuid        default auth.uid() references public.profiles (id) on delete set null,
  body        text        not null,
  status      public.content_status not null default 'published',
  vote_count  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint posts_body_len   check (char_length(body) between 1 and 10000),
  constraint posts_votes_nonneg check (vote_count >= 0),
  -- Needed so topics can reference (post, topic) and guarantee the accepted
  -- answer really belongs to the same topic.
  constraint posts_id_topic_key unique (id, topic_id)
);

alter table public.topics
  add constraint topics_accepted_post_fk
  foreign key (accepted_post_id, id)
  references public.posts (id, topic_id)
  on delete set null (accepted_post_id);

create index topics_search_idx   on public.topics using gin (search_vector);
create index topics_title_trgm   on public.topics using gin (title extensions.gin_trgm_ops);
create index topics_feed_idx     on public.topics (category_id, last_activity_at desc) where status = 'published';
create index topics_activity_idx on public.topics (last_activity_at desc)              where status = 'published';
create index topics_author_idx   on public.topics (author_id, created_at desc);
create index posts_topic_idx     on public.posts  (topic_id, created_at);
create index posts_author_idx    on public.posts  (author_id, created_at desc);

-- -----------------------------------------------------------------------------
-- tags / topic_tags
-- -----------------------------------------------------------------------------
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  slug       text        not null unique,
  name       text        not null,
  created_at timestamptz not null default now(),

  constraint tags_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,29}$'),
  constraint tags_name_len    check (char_length(name) between 1 and 40)
);

create table public.topic_tags (
  topic_id uuid not null references public.topics (id) on delete cascade,
  tag_id   uuid not null references public.tags   (id) on delete cascade,
  primary key (topic_id, tag_id)
);
create index topic_tags_tag_idx on public.topic_tags (tag_id);

-- -----------------------------------------------------------------------------
-- votes (upvotes on posts) / bookmarks (favorite resources)
-- -----------------------------------------------------------------------------
create table public.votes (
  user_id    uuid        not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id    uuid        not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index votes_post_idx on public.votes (post_id);

create table public.bookmarks (
  user_id     uuid        not null default auth.uid() references public.profiles (id) on delete cascade,
  resource_id uuid        not null references public.resources (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, resource_id)
);
create index bookmarks_resource_idx on public.bookmarks (resource_id);
create index bookmarks_user_idx     on public.bookmarks (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- reports  (exactly one target, real foreign keys)
-- -----------------------------------------------------------------------------
create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid        default auth.uid() references public.profiles (id) on delete set null,
  topic_id        uuid        references public.topics    (id) on delete cascade,
  post_id         uuid        references public.posts     (id) on delete cascade,
  resource_id     uuid        references public.resources (id) on delete cascade,
  profile_id      uuid        references public.profiles  (id) on delete cascade,
  reason          public.report_reason not null,
  details         text,
  status          public.report_status not null default 'open',
  handled_by      uuid        references public.profiles (id) on delete set null,
  handled_at      timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now(),

  constraint reports_one_target     check (num_nonnulls(topic_id, post_id, resource_id, profile_id) = 1),
  constraint reports_details_len    check (details is null or char_length(details) <= 1000),
  constraint reports_note_len       check (resolution_note is null or char_length(resolution_note) <= 1000)
);
create index reports_queue_idx on public.reports (status, created_at);
-- One open report per reporter per target
create unique index reports_dedupe_topic    on public.reports (reporter_id, topic_id)    where topic_id    is not null and status in ('open','reviewing');
create unique index reports_dedupe_post     on public.reports (reporter_id, post_id)     where post_id     is not null and status in ('open','reviewing');
create unique index reports_dedupe_resource on public.reports (reporter_id, resource_id) where resource_id is not null and status in ('open','reviewing');
create unique index reports_dedupe_profile  on public.reports (reporter_id, profile_id)  where profile_id  is not null and status in ('open','reviewing');
create index reports_topic_idx    on public.reports (topic_id)    where topic_id    is not null;
create index reports_post_idx     on public.reports (post_id)     where post_id     is not null;
create index reports_resource_idx on public.reports (resource_id) where resource_id is not null;
create index reports_profile_idx  on public.reports (profile_id)  where profile_id  is not null;

-- -----------------------------------------------------------------------------
-- notifications  (written only by SECURITY DEFINER code)
-- -----------------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  type        public.notification_type not null,
  actor_id    uuid        references public.profiles  (id) on delete set null,
  topic_id    uuid        references public.topics    (id) on delete cascade,
  post_id     uuid        references public.posts     (id) on delete cascade,
  resource_id uuid        references public.resources (id) on delete cascade,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx   on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;

-- -----------------------------------------------------------------------------
-- audit_logs  (append-only; admin read-only)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid        references public.profiles (id) on delete set null,
  action      text        not null,
  entity_type text        not null,
  entity_id   uuid,
  metadata    jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx   on public.audit_logs (actor_id, created_at desc);
create index audit_logs_entity_idx  on public.audit_logs (entity_type, entity_id);
