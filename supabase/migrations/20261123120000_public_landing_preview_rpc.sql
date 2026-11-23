-- =============================================================================
-- Vexor — Public Landing Preview RPC
-- =============================================================================
-- Exposes a strictly bounded, read-only preview (max 6) of published,
-- non-deleted community posts for the public landing page (`/`), without
-- opening raw `public.topics` or private profile columns to `anon`.
-- =============================================================================

begin;

create or replace function public.get_public_landing_posts(
  p_limit int default 4
)
returns table (
  id                     uuid,
  title                  text,
  excerpt                text,
  kind                   text,
  created_at             timestamptz,
  vote_count             int,
  reply_count            bigint,
  category_slug          text,
  category_name_pt       text,
  category_name_en       text,
  author_username        text,
  author_display_name    text,
  author_avatar_url      text,
  author_role            text,
  resource_slug          text,
  resource_name          text,
  resource_pricing_model text,
  resource_no_card       boolean,
  resource_content_policy text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    t.title,
    left(btrim(regexp_replace(coalesce(t.body, ''), '\s+', ' ', 'g')), 220) as excerpt,
    t.kind::text,
    t.created_at,
    coalesce(t.vote_count, 0) as vote_count,
    (
      select count(*)
      from public.posts po
      where po.topic_id = t.id
        and po.status = 'published'
        and po.deleted_at is null
    ) as reply_count,
    c.slug as category_slug,
    c.name_pt as category_name_pt,
    c.name_en as category_name_en,
    p.username as author_username,
    p.display_name as author_display_name,
    p.avatar_url as author_avatar_url,
    p.role::text as author_role,
    case when r.status = 'approved' then r.slug else null end as resource_slug,
    case when r.status = 'approved' then r.name else null end as resource_name,
    case when r.status = 'approved' then r.pricing_model::text else null end as resource_pricing_model,
    case when r.status = 'approved' then (r.requires_credit_card = 'no') else null end as resource_no_card,
    case when r.status = 'approved' then r.content_policy::text else null end as resource_content_policy
  from public.topics t
  join public.categories c on c.id = t.category_id
  left join public.profiles p on p.id = t.author_id
  left join public.resources r on r.id = t.resource_id
  where t.status = 'published'
    and t.deleted_at is null
  order by t.is_pinned desc, t.created_at desc
  limit greatest(1, least(coalesce(p_limit, 4), 6));
$$;

revoke all on function public.get_public_landing_posts(int) from public;
grant execute on function public.get_public_landing_posts(int) to anon, authenticated;

commit;
