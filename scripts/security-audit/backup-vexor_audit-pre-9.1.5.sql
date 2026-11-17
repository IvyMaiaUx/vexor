--
-- PostgreSQL database dump
--

\restrict JTrYFwnMqm2YE7Un3phvvHdYTUazVjHwRoXLaNOYkUSRDxx5yq4F1cUs9guITO4

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO postgres;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO postgres;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: category_scope; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.category_scope AS ENUM (
    'resource',
    'forum',
    'both'
);


ALTER TYPE public.category_scope OWNER TO postgres;

--
-- Name: content_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.content_status AS ENUM (
    'published',
    'hidden',
    'deleted'
);


ALTER TYPE public.content_status OWNER TO postgres;

--
-- Name: difficulty_level; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.difficulty_level AS ENUM (
    'beginner',
    'intermediate',
    'advanced'
);


ALTER TYPE public.difficulty_level OWNER TO postgres;

--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_type AS ENUM (
    'topic_reply',
    'solution_accepted',
    'resource_approved',
    'resource_rejected'
);


ALTER TYPE public.notification_type OWNER TO postgres;

--
-- Name: report_reason; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.report_reason AS ENUM (
    'spam',
    'malicious_content',
    'personal_data',
    'harassment',
    'unauthorized_attack',
    'copyright',
    'other'
);


ALTER TYPE public.report_reason OWNER TO postgres;

--
-- Name: report_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.report_status AS ENUM (
    'open',
    'reviewing',
    'resolved',
    'dismissed'
);


ALTER TYPE public.report_status OWNER TO postgres;

--
-- Name: resource_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.resource_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'archived'
);


ALTER TYPE public.resource_status OWNER TO postgres;

--
-- Name: resource_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.resource_type AS ENUM (
    'tool',
    'repository',
    'script',
    'framework',
    'documentation',
    'lab',
    'ctf_platform',
    'course',
    'article'
);


ALTER TYPE public.resource_type OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'member',
    'moderator',
    'admin'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: postgres
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;


ALTER FUNCTION auth.role() OWNER TO postgres;

--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: postgres
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;


ALTER FUNCTION auth.uid() OWNER TO postgres;

--
-- Name: admin_set_user_role(uuid, public.user_role); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_set_user_role(p_user_id uuid, p_role public.user_role) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.admin_set_user_role(p_user_id uuid, p_role public.user_role) OWNER TO postgres;

--
-- Name: admin_set_user_suspension(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_set_user_suspension(p_user_id uuid, p_suspended boolean, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.admin_set_user_suspension(p_user_id uuid, p_suspended boolean, p_reason text) OWNER TO postgres;

--
-- Name: audit_logs_block_mutation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.audit_logs_block_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  raise exception 'audit_logs is append-only' using errcode = '42501';
end;
$$;


ALTER FUNCTION public.audit_logs_block_mutation() OWNER TO postgres;

--
-- Name: current_user_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.current_user_role() RETURNS public.user_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and not p.is_suspended;
$$;


ALTER FUNCTION public.current_user_role() OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
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
$_$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: is_active_member(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_active_member() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and not p.is_suspended
  );
$$;


ALTER FUNCTION public.is_active_member() OWNER TO postgres;

--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;


ALTER FUNCTION public.is_admin() OWNER TO postgres;

--
-- Name: is_moderator(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_moderator() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select coalesce(public.current_user_role() in ('moderator', 'admin'), false);
$$;


ALTER FUNCTION public.is_moderator() OWNER TO postgres;

--
-- Name: moderate_post(uuid, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.moderate_post(p_post_id uuid, p_action text, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.moderate_post(p_post_id uuid, p_action text, p_reason text) OWNER TO postgres;

--
-- Name: moderate_resource(uuid, public.resource_status, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.moderate_resource(p_resource_id uuid, p_decision public.resource_status, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.moderate_resource(p_resource_id uuid, p_decision public.resource_status, p_reason text) OWNER TO postgres;

--
-- Name: moderate_topic(uuid, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.moderate_topic(p_topic_id uuid, p_action text, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.moderate_topic(p_topic_id uuid, p_action text, p_reason text) OWNER TO postgres;

--
-- Name: normalize_resource_url(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.normalize_resource_url(p_url text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    SET search_path TO ''
    AS $_$
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
$_$;


ALTER FUNCTION public.normalize_resource_url(p_url text) OWNER TO postgres;

--
-- Name: on_category_changed(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.on_category_changed() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.on_category_changed() OWNER TO postgres;

--
-- Name: on_post_created(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.on_post_created() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.on_post_created() OWNER TO postgres;

--
-- Name: on_vote_changed(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.on_vote_changed() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if tg_op = 'INSERT' then
    update public.posts set vote_count = vote_count + 1 where id = new.post_id;
  else
    update public.posts set vote_count = greatest(vote_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;


ALTER FUNCTION public.on_vote_changed() OWNER TO postgres;

--
-- Name: resolve_report(uuid, public.report_status, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.resolve_report(p_report_id uuid, p_status public.report_status, p_note text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.resolve_report(p_report_id uuid, p_status public.report_status, p_note text) OWNER TO postgres;

--
-- Name: resources_set_slug(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.resources_set_slug() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare
  v_base text;
begin
  v_base := trim(both '-' from regexp_replace(lower(extensions.unaccent(new.name)), '[^a-z0-9]+', '-', 'g'));
  v_base := left(coalesce(nullif(v_base, ''), 'resource'), 60);
  new.slug := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  return new;
end;
$$;


ALTER FUNCTION public.resources_set_slug() OWNER TO postgres;

--
-- Name: resubmit_resource(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.resubmit_resource(p_resource_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.resubmit_resource(p_resource_id uuid) OWNER TO postgres;

--
-- Name: set_accepted_post(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_accepted_post(p_topic_id uuid, p_post_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION public.set_accepted_post(p_topic_id uuid, p_post_id uuid) OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: topic_has_replies(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.topic_has_replies(p_topic_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (select 1 from public.posts where topic_id = p_topic_id);
$$;


ALTER FUNCTION public.topic_has_replies(p_topic_id uuid) OWNER TO postgres;

--
-- Name: topic_tags_limit(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.topic_tags_limit() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if (select count(*) from public.topic_tags where topic_id = new.topic_id) >= 5 then
    raise exception 'a topic can have at most 5 tags' using errcode = '23514';
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.topic_tags_limit() OWNER TO postgres;

--
-- Name: write_audit_log(text, text, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.write_audit_log(p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;


ALTER FUNCTION public.write_audit_log(p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb) OWNER TO postgres;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: postgres
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  RETURN string_to_array(name, '/');
END;
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE auth.users OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    actor_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bookmarks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookmarks (
    user_id uuid DEFAULT auth.uid() NOT NULL,
    resource_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bookmarks OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name_en text NOT NULL,
    name_pt text NOT NULL,
    description_en text,
    description_pt text,
    scope public.category_scope DEFAULT 'both'::public.category_scope NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT categories_slug_format CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: TABLE categories; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.categories IS 'Categories are deactivated (is_active=false), not deleted, once in use.';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type public.notification_type NOT NULL,
    actor_id uuid,
    topic_id uuid,
    post_id uuid,
    resource_id uuid,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic_id uuid NOT NULL,
    author_id uuid DEFAULT auth.uid(),
    body text NOT NULL,
    status public.content_status DEFAULT 'published'::public.content_status NOT NULL,
    vote_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT posts_body_len CHECK (((char_length(body) >= 1) AND (char_length(body) <= 10000))),
    CONSTRAINT posts_votes_nonneg CHECK ((vote_count >= 0))
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text NOT NULL,
    display_name text,
    avatar_url text,
    bio text,
    interests text[] DEFAULT '{}'::text[] NOT NULL,
    github_url text,
    linkedin_url text,
    preferred_locale text DEFAULT 'en'::text NOT NULL,
    role public.user_role DEFAULT 'member'::public.user_role NOT NULL,
    is_suspended boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_avatar_https CHECK (((avatar_url IS NULL) OR (avatar_url ~ '^https://'::text))),
    CONSTRAINT profiles_bio_len CHECK (((bio IS NULL) OR (char_length(bio) <= 500))),
    CONSTRAINT profiles_display_name_len CHECK (((display_name IS NULL) OR ((char_length(display_name) >= 1) AND (char_length(display_name) <= 60)))),
    CONSTRAINT profiles_github_url CHECK (((github_url IS NULL) OR (github_url ~ '^https://(www\.)?github\.com/[A-Za-z0-9._-]+/?$'::text))),
    CONSTRAINT profiles_interests_max CHECK ((cardinality(interests) <= 10)),
    CONSTRAINT profiles_linkedin_url CHECK (((linkedin_url IS NULL) OR (linkedin_url ~ '^https://([a-z]{2,3}\.)?linkedin\.com/(in|company)/[A-Za-z0-9._%-]+/?$'::text))),
    CONSTRAINT profiles_locale CHECK ((preferred_locale = ANY (ARRAY['pt-BR'::text, 'en'::text]))),
    CONSTRAINT profiles_username_format CHECK ((username ~ '^[a-z0-9_]{3,30}$'::text))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.profiles IS 'Public member profile. Email lives only in auth.users.';


--
-- Name: COLUMN profiles.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.role IS 'Never writable by clients. Changed only via admin_set_user_role().';


--
-- Name: public_profiles; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.public_profiles WITH (security_invoker='false') AS
 SELECT id,
    username,
    display_name,
    avatar_url,
    bio,
    interests,
    github_url,
    linkedin_url,
    preferred_locale,
    created_at,
    role
   FROM public.profiles p
  WHERE ((NOT is_suspended) OR ( SELECT public.is_moderator() AS is_moderator));


ALTER VIEW public.public_profiles OWNER TO postgres;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid DEFAULT auth.uid(),
    topic_id uuid,
    post_id uuid,
    resource_id uuid,
    profile_id uuid,
    reason public.report_reason NOT NULL,
    details text,
    status public.report_status DEFAULT 'open'::public.report_status NOT NULL,
    handled_by uuid,
    handled_at timestamp with time zone,
    resolution_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reports_details_len CHECK (((details IS NULL) OR (char_length(details) <= 1000))),
    CONSTRAINT reports_note_len CHECK (((resolution_note IS NULL) OR (char_length(resolution_note) <= 1000))),
    CONSTRAINT reports_one_target CHECK ((num_nonnulls(topic_id, post_id, resource_id, profile_id) = 1))
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: resources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    category_id uuid NOT NULL,
    type public.resource_type NOT NULL,
    url text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    difficulty public.difficulty_level,
    author_name text,
    submitted_by uuid DEFAULT auth.uid(),
    status public.resource_status DEFAULT 'pending'::public.resource_status NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    rejection_reason text,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, ((COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text)))) STORED,
    CONSTRAINT resources_author_len CHECK (((author_name IS NULL) OR (char_length(author_name) <= 120))),
    CONSTRAINT resources_desc_len CHECK (((char_length(description) >= 10) AND (char_length(description) <= 2000))),
    CONSTRAINT resources_language CHECK ((language = ANY (ARRAY['en'::text, 'pt-BR'::text, 'multilingual'::text, 'other'::text]))),
    CONSTRAINT resources_name_len CHECK (((char_length(name) >= 2) AND (char_length(name) <= 120))),
    CONSTRAINT resources_reject_reason CHECK (((status <> 'rejected'::public.resource_status) OR (rejection_reason IS NOT NULL))),
    CONSTRAINT resources_url_scheme CHECK (((url ~* '^https?://[^[:space:]]+$'::text) AND (char_length(url) <= 2048)))
);


ALTER TABLE public.resources OWNER TO postgres;

--
-- Name: COLUMN resources.published_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.resources.published_at IS '"Data de inclusão": set when first approved.';


--
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tags_name_len CHECK (((char_length(name) >= 1) AND (char_length(name) <= 40))),
    CONSTRAINT tags_slug_format CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{0,29}$'::text))
);


ALTER TABLE public.tags OWNER TO postgres;

--
-- Name: topic_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.topic_tags (
    topic_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


ALTER TABLE public.topic_tags OWNER TO postgres;

--
-- Name: topics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.topics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid DEFAULT auth.uid(),
    category_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    status public.content_status DEFAULT 'published'::public.content_status NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    accepted_post_id uuid,
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS ((setweight(to_tsvector('simple'::regconfig, COALESCE(title, ''::text)), 'A'::"char") || setweight(to_tsvector('simple'::regconfig, COALESCE(body, ''::text)), 'B'::"char"))) STORED,
    CONSTRAINT topics_body_len CHECK (((char_length(body) >= 10) AND (char_length(body) <= 20000))),
    CONSTRAINT topics_title_len CHECK (((char_length(title) >= 5) AND (char_length(title) <= 200)))
);


ALTER TABLE public.topics OWNER TO postgres;

--
-- Name: votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.votes (
    user_id uuid DEFAULT auth.uid() NOT NULL,
    post_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.votes OWNER TO postgres;

--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: postgres
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text
);


ALTER TABLE storage.buckets OWNER TO postgres;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: postgres
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED
);


ALTER TABLE storage.objects OWNER TO postgres;

--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.users (id, email, raw_user_meta_data, created_at) FROM stdin;
00000000-0000-0000-0000-000000000001	adminA@vexor.test	{"username": "admin_alpha", "display_name": "Admin Alpha"}	2026-11-12 18:55:58.59635-03
00000000-0000-0000-0000-000000000002	adminB@vexor.test	{"username": "admin_bravo", "display_name": "Admin Bravo"}	2026-11-12 18:55:58.59635-03
00000000-0000-0000-0000-000000000003	memberU@vexor.test	{"username": "member_user", "display_name": "Member User"}	2026-11-12 18:55:58.59635-03
00000000-0000-0000-0000-000000000004	suspendedU@vexor.test	{"username": "suspended_user", "display_name": "Suspended User"}	2026-11-12 18:55:58.59635-03
00000000-0000-0000-0000-000000000005	modM@vexor.test	{"username": "mod_user", "display_name": "Moderator User"}	2026-11-12 18:55:58.59635-03
91370003-0000-0000-0000-000000000001	c3_admin_a@vexor.local	{"username": "c3_admin_a"}	2026-11-12 21:27:28.259302-03
91370003-0000-0000-0000-000000000002	c3_admin_b@vexor.local	{"username": "c3_admin_b"}	2026-11-12 21:27:28.259302-03
91370003-0000-0000-0000-000000000003	c3_target_1@vexor.local	{"username": "c3_target_1"}	2026-11-12 21:27:28.259302-03
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) FROM stdin;
1	00000000-0000-0000-0000-000000000001	user.role_changed	profile	00000000-0000-0000-0000-000000000002	{"to": "member", "from": "admin"}	2026-11-12 18:56:00.294824-03
2	00000000-0000-0000-0000-000000000001	test.init	system	\N	{}	2026-11-12 18:56:08.520703-03
7	91370003-0000-0000-0000-000000000001	user.role_changed	profile	91370003-0000-0000-0000-000000000002	{"to": "member", "from": "admin"}	2026-11-12 21:27:28.29351-03
8	91370003-0000-0000-0000-000000000001	user.role_changed	profile	91370003-0000-0000-0000-000000000002	{"to": "member", "from": "admin"}	2026-11-12 21:27:28.398831-03
9	91370003-0000-0000-0000-000000000002	user.role_changed	profile	91370003-0000-0000-0000-000000000003	{"to": "moderator", "from": "member"}	2026-11-12 21:27:28.379607-03
\.


--
-- Data for Name: bookmarks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookmarks (user_id, resource_id, created_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, slug, name_en, name_pt, description_en, description_pt, scope, sort_order, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, actor_id, topic_id, post_id, resource_id, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posts (id, topic_id, author_id, body, status, vote_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profiles (id, username, display_name, avatar_url, bio, interests, github_url, linkedin_url, preferred_locale, role, is_suspended, created_at, updated_at) FROM stdin;
00000000-0000-0000-0000-000000000001	admin_alpha	Admin Alpha	\N	\N	{}	\N	\N	en	admin	f	2026-11-12 18:55:58.59635-03	2026-11-12 18:55:58.59635-03
00000000-0000-0000-0000-000000000005	mod_user	Moderator User	\N	\N	{}	\N	\N	en	moderator	f	2026-11-12 18:55:58.59635-03	2026-11-12 18:55:58.59635-03
00000000-0000-0000-0000-000000000004	suspended_user	Suspended User	\N	\N	{}	\N	\N	en	member	t	2026-11-12 18:55:58.59635-03	2026-11-12 18:55:58.59635-03
00000000-0000-0000-0000-000000000003	member_user	Member User	\N	\N	{}	\N	\N	en	member	f	2026-11-12 18:55:58.59635-03	2026-11-12 18:55:58.59635-03
00000000-0000-0000-0000-000000000002	admin_bravo	Admin Bravo	\N	\N	{}	\N	\N	en	member	f	2026-11-12 18:55:58.59635-03	2026-11-12 18:56:00.294824-03
91370003-0000-0000-0000-000000000001	c3_admin_a	\N	\N	\N	{}	\N	\N	en	admin	f	2026-11-12 21:27:28.259302-03	2026-11-12 21:27:28.288338-03
91370003-0000-0000-0000-000000000002	c3_admin_b	\N	\N	\N	{}	\N	\N	en	member	f	2026-11-12 21:27:28.259302-03	2026-11-12 21:27:28.398831-03
91370003-0000-0000-0000-000000000003	c3_target_1	\N	\N	holding row lock on target	{}	\N	\N	en	moderator	f	2026-11-12 21:27:28.259302-03	2026-11-12 21:27:28.379607-03
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, reporter_id, topic_id, post_id, resource_id, profile_id, reason, details, status, handled_by, handled_at, resolution_note, created_at) FROM stdin;
\.


--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resources (id, slug, name, description, category_id, type, url, language, difficulty, author_name, submitted_by, status, reviewed_by, reviewed_at, rejection_reason, published_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tags (id, slug, name, created_at) FROM stdin;
\.


--
-- Data for Name: topic_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.topic_tags (topic_id, tag_id) FROM stdin;
\.


--
-- Data for Name: topics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.topics (id, author_id, category_id, title, body, status, is_pinned, is_locked, accepted_post_id, last_activity_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: votes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.votes (user_id, post_id, created_at) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: postgres
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id) FROM stdin;
avatars	avatars	\N	2026-11-12 18:55:54.995962-03	2026-11-12 18:55:54.995962-03	t	f	2097152	{image/png,image/jpeg,image/webp}	\N
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: postgres
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata) FROM stdin;
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 9, true);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bookmarks bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_pkey PRIMARY KEY (user_id, resource_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: posts posts_id_topic_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_id_topic_key UNIQUE (id, topic_id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: resources resources_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_slug_key UNIQUE (slug);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: tags tags_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_slug_key UNIQUE (slug);


--
-- Name: topic_tags topic_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.topic_tags
    ADD CONSTRAINT topic_tags_pkey PRIMARY KEY (topic_id, tag_id);


--
-- Name: topics topics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_pkey PRIMARY KEY (id);


--
-- Name: votes votes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_pkey PRIMARY KEY (user_id, post_id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: postgres
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: postgres
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_actor_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_actor_idx ON public.audit_logs USING btree (actor_id, created_at DESC);


--
-- Name: audit_logs_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_created_idx ON public.audit_logs USING btree (created_at DESC);


--
-- Name: audit_logs_entity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_entity_idx ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: bookmarks_resource_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bookmarks_resource_idx ON public.bookmarks USING btree (resource_id);


--
-- Name: bookmarks_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bookmarks_user_idx ON public.bookmarks USING btree (user_id, created_at DESC);


--
-- Name: notifications_unread_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_unread_idx ON public.notifications USING btree (user_id, created_at DESC) WHERE (read_at IS NULL);


--
-- Name: notifications_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_user_idx ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: posts_author_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX posts_author_idx ON public.posts USING btree (author_id, created_at DESC);


--
-- Name: posts_topic_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX posts_topic_idx ON public.posts USING btree (topic_id, created_at);


--
-- Name: profiles_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX profiles_role_idx ON public.profiles USING btree (role) WHERE (role <> 'member'::public.user_role);


--
-- Name: profiles_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);


--
-- Name: reports_dedupe_post; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX reports_dedupe_post ON public.reports USING btree (reporter_id, post_id) WHERE ((post_id IS NOT NULL) AND (status = ANY (ARRAY['open'::public.report_status, 'reviewing'::public.report_status])));


--
-- Name: reports_dedupe_profile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX reports_dedupe_profile ON public.reports USING btree (reporter_id, profile_id) WHERE ((profile_id IS NOT NULL) AND (status = ANY (ARRAY['open'::public.report_status, 'reviewing'::public.report_status])));


--
-- Name: reports_dedupe_resource; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX reports_dedupe_resource ON public.reports USING btree (reporter_id, resource_id) WHERE ((resource_id IS NOT NULL) AND (status = ANY (ARRAY['open'::public.report_status, 'reviewing'::public.report_status])));


--
-- Name: reports_dedupe_topic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX reports_dedupe_topic ON public.reports USING btree (reporter_id, topic_id) WHERE ((topic_id IS NOT NULL) AND (status = ANY (ARRAY['open'::public.report_status, 'reviewing'::public.report_status])));


--
-- Name: reports_post_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_post_idx ON public.reports USING btree (post_id) WHERE (post_id IS NOT NULL);


--
-- Name: reports_profile_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_profile_idx ON public.reports USING btree (profile_id) WHERE (profile_id IS NOT NULL);


--
-- Name: reports_queue_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_queue_idx ON public.reports USING btree (status, created_at);


--
-- Name: reports_resource_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_resource_idx ON public.reports USING btree (resource_id) WHERE (resource_id IS NOT NULL);


--
-- Name: reports_topic_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reports_topic_idx ON public.reports USING btree (topic_id) WHERE (topic_id IS NOT NULL);


--
-- Name: resources_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX resources_category_idx ON public.resources USING btree (category_id, published_at DESC) WHERE (status = 'approved'::public.resource_status);


--
-- Name: resources_difficulty_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX resources_difficulty_idx ON public.resources USING btree (difficulty) WHERE (status = 'approved'::public.resource_status);


--
-- Name: resources_name_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX resources_name_trgm ON public.resources USING gin (name extensions.gin_trgm_ops);


--
-- Name: resources_pending_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX resources_pending_idx ON public.resources USING btree (created_at) WHERE (status = 'pending'::public.resource_status);


--
-- Name: resources_published_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX resources_published_idx ON public.resources USING btree (published_at DESC) WHERE (status = 'approved'::public.resource_status);


--
-- Name: resources_search_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX resources_search_idx ON public.resources USING gin (search_vector);


--
-- Name: resources_submitter_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX resources_submitter_idx ON public.resources USING btree (submitted_by, created_at DESC);


--
-- Name: resources_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX resources_type_idx ON public.resources USING btree (type, published_at DESC) WHERE (status = 'approved'::public.resource_status);


--
-- Name: resources_url_active_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX resources_url_active_key ON public.resources USING btree (public.normalize_resource_url(url)) WHERE (status = ANY (ARRAY['pending'::public.resource_status, 'approved'::public.resource_status]));


--
-- Name: topic_tags_tag_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX topic_tags_tag_idx ON public.topic_tags USING btree (tag_id);


--
-- Name: topics_activity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX topics_activity_idx ON public.topics USING btree (last_activity_at DESC) WHERE (status = 'published'::public.content_status);


--
-- Name: topics_author_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX topics_author_idx ON public.topics USING btree (author_id, created_at DESC);


--
-- Name: topics_feed_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX topics_feed_idx ON public.topics USING btree (category_id, last_activity_at DESC) WHERE (status = 'published'::public.content_status);


--
-- Name: topics_search_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX topics_search_idx ON public.topics USING gin (search_vector);


--
-- Name: topics_title_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX topics_title_trgm ON public.topics USING gin (title extensions.gin_trgm_ops);


--
-- Name: votes_post_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX votes_post_idx ON public.votes USING btree (post_id);


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: postgres
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: audit_logs audit_logs_no_truncate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_logs_no_truncate BEFORE TRUNCATE ON public.audit_logs FOR EACH STATEMENT EXECUTE FUNCTION public.audit_logs_block_mutation();


--
-- Name: audit_logs audit_logs_no_update_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_logs_no_update_delete BEFORE DELETE OR UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.audit_logs_block_mutation();


--
-- Name: categories categories_after_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER categories_after_change AFTER INSERT OR DELETE OR UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.on_category_changed();


--
-- Name: categories categories_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: posts posts_after_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER posts_after_insert AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.on_post_created();


--
-- Name: posts posts_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles profiles_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: resources resources_before_insert_slug; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER resources_before_insert_slug BEFORE INSERT ON public.resources FOR EACH ROW EXECUTE FUNCTION public.resources_set_slug();


--
-- Name: resources resources_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER resources_set_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: topic_tags topic_tags_before_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER topic_tags_before_insert BEFORE INSERT ON public.topic_tags FOR EACH ROW EXECUTE FUNCTION public.topic_tags_limit();


--
-- Name: topics topics_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER topics_set_updated_at BEFORE UPDATE ON public.topics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: votes votes_after_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER votes_after_change AFTER INSERT OR DELETE ON public.votes FOR EACH ROW EXECUTE FUNCTION public.on_vote_changed();


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: bookmarks bookmarks_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: bookmarks bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: posts posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: posts posts_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_handled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: reports reports_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: reports reports_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: reports reports_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: reports reports_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;


--
-- Name: resources resources_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: resources resources_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: resources resources_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: topic_tags topic_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.topic_tags
    ADD CONSTRAINT topic_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: topic_tags topic_tags_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.topic_tags
    ADD CONSTRAINT topic_tags_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE;


--
-- Name: topics topics_accepted_post_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_accepted_post_fk FOREIGN KEY (accepted_post_id, id) REFERENCES public.posts(id, topic_id) ON DELETE SET NULL (accepted_post_id);


--
-- Name: topics topics_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: topics topics_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: votes votes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: votes votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: postgres
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_logs_select_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_logs_select_admin ON public.audit_logs FOR SELECT TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: bookmarks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

--
-- Name: bookmarks bookmarks_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY bookmarks_delete_own ON public.bookmarks FOR DELETE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND ( SELECT public.is_active_member() AS is_active_member)));


--
-- Name: bookmarks bookmarks_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY bookmarks_insert ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND ( SELECT public.is_active_member() AS is_active_member) AND (EXISTS ( SELECT 1
   FROM public.resources r
  WHERE ((r.id = bookmarks.resource_id) AND (r.status = 'approved'::public.resource_status))))));


--
-- Name: bookmarks bookmarks_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY bookmarks_select_own ON public.bookmarks FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_delete_admin ON public.categories FOR DELETE TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: categories categories_insert_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_insert_admin ON public.categories FOR INSERT TO authenticated WITH CHECK (( SELECT public.is_admin() AS is_admin));


--
-- Name: categories categories_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_select ON public.categories FOR SELECT TO anon, authenticated USING ((is_active OR ( SELECT public.is_admin() AS is_admin)));


--
-- Name: categories categories_update_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_update_admin ON public.categories FOR UPDATE TO authenticated USING (( SELECT public.is_admin() AS is_admin)) WITH CHECK (( SELECT public.is_admin() AS is_admin));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_delete_own ON public.notifications FOR DELETE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND ( SELECT public.is_active_member() AS is_active_member)));


--
-- Name: notifications notifications_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_select_own ON public.notifications FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: notifications notifications_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND ( SELECT public.is_active_member() AS is_active_member))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND ( SELECT public.is_active_member() AS is_active_member)));


--
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- Name: posts posts_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY posts_delete_admin ON public.posts FOR DELETE TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: posts posts_delete_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY posts_delete_owner ON public.posts FOR DELETE TO authenticated USING (((author_id = ( SELECT auth.uid() AS uid)) AND (status = 'published'::public.content_status) AND ( SELECT public.is_active_member() AS is_active_member) AND (EXISTS ( SELECT 1
   FROM public.topics t
  WHERE ((t.id = posts.topic_id) AND (t.status = 'published'::public.content_status) AND ((NOT t.is_locked) OR ( SELECT public.is_moderator() AS is_moderator)))))));


--
-- Name: posts posts_insert_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY posts_insert_member ON public.posts FOR INSERT TO authenticated WITH CHECK ((( SELECT public.is_active_member() AS is_active_member) AND (author_id = ( SELECT auth.uid() AS uid)) AND (status = 'published'::public.content_status) AND (EXISTS ( SELECT 1
   FROM public.topics t
  WHERE ((t.id = posts.topic_id) AND (t.status = 'published'::public.content_status) AND ((NOT t.is_locked) OR ( SELECT public.is_moderator() AS is_moderator)))))));


--
-- Name: posts posts_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY posts_select ON public.posts FOR SELECT TO anon, authenticated USING ((((status = 'published'::public.content_status) AND (EXISTS ( SELECT 1
   FROM public.topics t
  WHERE (t.id = posts.topic_id)))) OR (author_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_moderator() AS is_moderator)));


--
-- Name: posts posts_update_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY posts_update_owner ON public.posts FOR UPDATE TO authenticated USING (((author_id = ( SELECT auth.uid() AS uid)) AND (status = 'published'::public.content_status) AND ( SELECT public.is_active_member() AS is_active_member) AND (EXISTS ( SELECT 1
   FROM public.topics t
  WHERE ((t.id = posts.topic_id) AND (t.status = 'published'::public.content_status) AND ((NOT t.is_locked) OR ( SELECT public.is_moderator() AS is_moderator))))))) WITH CHECK (((author_id = ( SELECT auth.uid() AS uid)) AND (status = 'published'::public.content_status) AND ( SELECT public.is_active_member() AS is_active_member) AND (EXISTS ( SELECT 1
   FROM public.topics t
  WHERE ((t.id = posts.topic_id) AND (t.status = 'published'::public.content_status) AND ((NOT t.is_locked) OR ( SELECT public.is_moderator() AS is_moderator)))))));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_select_public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_select_public ON public.profiles FOR SELECT TO anon, authenticated USING (true);


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (((id = ( SELECT auth.uid() AS uid)) AND ( SELECT public.is_active_member() AS is_active_member))) WITH CHECK (((id = ( SELECT auth.uid() AS uid)) AND ( SELECT public.is_active_member() AS is_active_member)));


--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- Name: reports reports_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reports_insert ON public.reports FOR INSERT TO authenticated WITH CHECK (((reporter_id = ( SELECT auth.uid() AS uid)) AND ( SELECT public.is_active_member() AS is_active_member) AND (status = 'open'::public.report_status)));


--
-- Name: reports reports_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY reports_select ON public.reports FOR SELECT TO authenticated USING (((reporter_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_moderator() AS is_moderator)));


--
-- Name: resources; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

--
-- Name: resources resources_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY resources_delete_admin ON public.resources FOR DELETE TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: resources resources_delete_owner_pending; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY resources_delete_owner_pending ON public.resources FOR DELETE TO authenticated USING (((submitted_by = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::public.resource_status) AND ( SELECT public.is_active_member() AS is_active_member)));


--
-- Name: resources resources_insert_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY resources_insert_member ON public.resources FOR INSERT TO authenticated WITH CHECK ((( SELECT public.is_active_member() AS is_active_member) AND (submitted_by = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::public.resource_status) AND (EXISTS ( SELECT 1
   FROM public.categories c
  WHERE ((c.id = resources.category_id) AND c.is_active AND (c.scope = ANY (ARRAY['resource'::public.category_scope, 'both'::public.category_scope])))))));


--
-- Name: resources resources_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY resources_select ON public.resources FOR SELECT TO anon, authenticated USING (((status = 'approved'::public.resource_status) OR (submitted_by = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_moderator() AS is_moderator)));


--
-- Name: resources resources_update_moderator; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY resources_update_moderator ON public.resources FOR UPDATE TO authenticated USING (( SELECT public.is_moderator() AS is_moderator)) WITH CHECK (( SELECT public.is_moderator() AS is_moderator));


--
-- Name: resources resources_update_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY resources_update_owner ON public.resources FOR UPDATE TO authenticated USING (((submitted_by = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['pending'::public.resource_status, 'rejected'::public.resource_status])) AND ( SELECT public.is_active_member() AS is_active_member))) WITH CHECK (((submitted_by = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['pending'::public.resource_status, 'rejected'::public.resource_status])) AND ( SELECT public.is_active_member() AS is_active_member)));


--
-- Name: tags; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

--
-- Name: tags tags_delete_moderator; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tags_delete_moderator ON public.tags FOR DELETE TO authenticated USING (( SELECT public.is_moderator() AS is_moderator));


--
-- Name: tags tags_insert_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tags_insert_member ON public.tags FOR INSERT TO authenticated WITH CHECK (( SELECT public.is_active_member() AS is_active_member));


--
-- Name: tags tags_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tags_select ON public.tags FOR SELECT TO anon, authenticated USING (true);


--
-- Name: tags tags_update_moderator; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tags_update_moderator ON public.tags FOR UPDATE TO authenticated USING (( SELECT public.is_moderator() AS is_moderator)) WITH CHECK (( SELECT public.is_moderator() AS is_moderator));


--
-- Name: topic_tags; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.topic_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: topic_tags topic_tags_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY topic_tags_delete ON public.topic_tags FOR DELETE TO authenticated USING ((( SELECT public.is_active_member() AS is_active_member) AND (EXISTS ( SELECT 1
   FROM public.topics t
  WHERE ((t.id = topic_tags.topic_id) AND (((t.author_id = ( SELECT auth.uid() AS uid)) AND (t.status = 'published'::public.content_status) AND (NOT t.is_locked)) OR ( SELECT public.is_moderator() AS is_moderator)))))));


--
-- Name: topic_tags topic_tags_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY topic_tags_insert ON public.topic_tags FOR INSERT TO authenticated WITH CHECK ((( SELECT public.is_active_member() AS is_active_member) AND (EXISTS ( SELECT 1
   FROM public.topics t
  WHERE ((t.id = topic_tags.topic_id) AND (((t.author_id = ( SELECT auth.uid() AS uid)) AND (t.status = 'published'::public.content_status) AND (NOT t.is_locked)) OR ( SELECT public.is_moderator() AS is_moderator)))))));


--
-- Name: topic_tags topic_tags_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY topic_tags_select ON public.topic_tags FOR SELECT TO anon, authenticated USING ((EXISTS ( SELECT 1
   FROM public.topics t
  WHERE (t.id = topic_tags.topic_id))));


--
-- Name: topics; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

--
-- Name: topics topics_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY topics_delete_admin ON public.topics FOR DELETE TO authenticated USING (( SELECT public.is_admin() AS is_admin));


--
-- Name: topics topics_delete_owner_unanswered; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY topics_delete_owner_unanswered ON public.topics FOR DELETE TO authenticated USING (((author_id = ( SELECT auth.uid() AS uid)) AND (status = 'published'::public.content_status) AND (NOT is_locked) AND ( SELECT public.is_active_member() AS is_active_member) AND (NOT public.topic_has_replies(id))));


--
-- Name: topics topics_insert_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY topics_insert_member ON public.topics FOR INSERT TO authenticated WITH CHECK ((( SELECT public.is_active_member() AS is_active_member) AND (author_id = ( SELECT auth.uid() AS uid)) AND (status = 'published'::public.content_status) AND (EXISTS ( SELECT 1
   FROM public.categories c
  WHERE ((c.id = topics.category_id) AND c.is_active AND (c.scope = ANY (ARRAY['forum'::public.category_scope, 'both'::public.category_scope])))))));


--
-- Name: topics topics_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY topics_select ON public.topics FOR SELECT TO anon, authenticated USING (((status = 'published'::public.content_status) OR (author_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_moderator() AS is_moderator)));


--
-- Name: topics topics_update_moderator; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY topics_update_moderator ON public.topics FOR UPDATE TO authenticated USING (( SELECT public.is_moderator() AS is_moderator)) WITH CHECK (( SELECT public.is_moderator() AS is_moderator));


--
-- Name: topics topics_update_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY topics_update_owner ON public.topics FOR UPDATE TO authenticated USING (((author_id = ( SELECT auth.uid() AS uid)) AND (status = 'published'::public.content_status) AND (NOT is_locked) AND ( SELECT public.is_active_member() AS is_active_member))) WITH CHECK (((author_id = ( SELECT auth.uid() AS uid)) AND (status = 'published'::public.content_status) AND (NOT is_locked) AND ( SELECT public.is_active_member() AS is_active_member)));


--
-- Name: votes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

--
-- Name: votes votes_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY votes_delete_own ON public.votes FOR DELETE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) AND ( SELECT public.is_active_member() AS is_active_member)));


--
-- Name: votes votes_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY votes_insert ON public.votes FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND ( SELECT public.is_active_member() AS is_active_member) AND (EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = votes.post_id) AND (p.status = 'published'::public.content_status) AND (p.author_id IS DISTINCT FROM ( SELECT auth.uid() AS uid)))))));


--
-- Name: votes votes_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY votes_select_own ON public.votes FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: objects avatars_delete_own; Type: POLICY; Schema: storage; Owner: postgres
--

CREATE POLICY avatars_delete_own ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND ( SELECT public.is_active_member() AS is_active_member)));


--
-- Name: objects avatars_insert_own; Type: POLICY; Schema: storage; Owner: postgres
--

CREATE POLICY avatars_insert_own ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND ( SELECT public.is_active_member() AS is_active_member)));


--
-- Name: objects avatars_update_own; Type: POLICY; Schema: storage; Owner: postgres
--

CREATE POLICY avatars_update_own ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND ( SELECT public.is_active_member() AS is_active_member))) WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND ( SELECT public.is_active_member() AS is_active_member)));


--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: postgres
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: postgres
--

GRANT ALL ON FUNCTION auth.role() TO anon;
GRANT ALL ON FUNCTION auth.role() TO authenticated;
GRANT ALL ON FUNCTION auth.role() TO service_role;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: postgres
--

GRANT ALL ON FUNCTION auth.uid() TO anon;
GRANT ALL ON FUNCTION auth.uid() TO authenticated;
GRANT ALL ON FUNCTION auth.uid() TO service_role;


--
-- Name: FUNCTION admin_set_user_role(p_user_id uuid, p_role public.user_role); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.admin_set_user_role(p_user_id uuid, p_role public.user_role) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_set_user_role(p_user_id uuid, p_role public.user_role) TO authenticated;


--
-- Name: FUNCTION admin_set_user_suspension(p_user_id uuid, p_suspended boolean, p_reason text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.admin_set_user_suspension(p_user_id uuid, p_suspended boolean, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_set_user_suspension(p_user_id uuid, p_suspended boolean, p_reason text) TO authenticated;


--
-- Name: FUNCTION audit_logs_block_mutation(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.audit_logs_block_mutation() FROM PUBLIC;


--
-- Name: FUNCTION current_user_role(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.current_user_role() TO anon;
GRANT ALL ON FUNCTION public.current_user_role() TO authenticated;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;


--
-- Name: FUNCTION is_active_member(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_active_member() TO anon;
GRANT ALL ON FUNCTION public.is_active_member() TO authenticated;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;


--
-- Name: FUNCTION is_moderator(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_moderator() TO anon;
GRANT ALL ON FUNCTION public.is_moderator() TO authenticated;


--
-- Name: FUNCTION moderate_post(p_post_id uuid, p_action text, p_reason text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.moderate_post(p_post_id uuid, p_action text, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.moderate_post(p_post_id uuid, p_action text, p_reason text) TO authenticated;


--
-- Name: FUNCTION moderate_resource(p_resource_id uuid, p_decision public.resource_status, p_reason text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.moderate_resource(p_resource_id uuid, p_decision public.resource_status, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.moderate_resource(p_resource_id uuid, p_decision public.resource_status, p_reason text) TO authenticated;


--
-- Name: FUNCTION moderate_topic(p_topic_id uuid, p_action text, p_reason text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.moderate_topic(p_topic_id uuid, p_action text, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.moderate_topic(p_topic_id uuid, p_action text, p_reason text) TO authenticated;


--
-- Name: FUNCTION normalize_resource_url(p_url text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.normalize_resource_url(p_url text) TO anon;
GRANT ALL ON FUNCTION public.normalize_resource_url(p_url text) TO authenticated;


--
-- Name: FUNCTION on_category_changed(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.on_category_changed() FROM PUBLIC;


--
-- Name: FUNCTION on_post_created(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.on_post_created() FROM PUBLIC;


--
-- Name: FUNCTION on_vote_changed(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.on_vote_changed() FROM PUBLIC;


--
-- Name: FUNCTION resolve_report(p_report_id uuid, p_status public.report_status, p_note text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.resolve_report(p_report_id uuid, p_status public.report_status, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.resolve_report(p_report_id uuid, p_status public.report_status, p_note text) TO authenticated;


--
-- Name: FUNCTION resources_set_slug(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.resources_set_slug() FROM PUBLIC;


--
-- Name: FUNCTION resubmit_resource(p_resource_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.resubmit_resource(p_resource_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.resubmit_resource(p_resource_id uuid) TO authenticated;


--
-- Name: FUNCTION set_accepted_post(p_topic_id uuid, p_post_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.set_accepted_post(p_topic_id uuid, p_post_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_accepted_post(p_topic_id uuid, p_post_id uuid) TO authenticated;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;


--
-- Name: FUNCTION topic_has_replies(p_topic_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.topic_has_replies(p_topic_id uuid) TO anon;
GRANT ALL ON FUNCTION public.topic_has_replies(p_topic_id uuid) TO authenticated;


--
-- Name: FUNCTION topic_tags_limit(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.topic_tags_limit() FROM PUBLIC;


--
-- Name: FUNCTION write_audit_log(p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.write_audit_log(p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb) FROM PUBLIC;


--
-- Name: FUNCTION foldername(name text); Type: ACL; Schema: storage; Owner: postgres
--

GRANT ALL ON FUNCTION storage.foldername(name text) TO anon;
GRANT ALL ON FUNCTION storage.foldername(name text) TO authenticated;
GRANT ALL ON FUNCTION storage.foldername(name text) TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: postgres
--

GRANT SELECT ON TABLE auth.users TO anon;
GRANT SELECT ON TABLE auth.users TO authenticated;
GRANT SELECT ON TABLE auth.users TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.audit_logs TO authenticated;


--
-- Name: TABLE bookmarks; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,DELETE ON TABLE public.bookmarks TO authenticated;


--
-- Name: COLUMN bookmarks.resource_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(resource_id) ON TABLE public.bookmarks TO authenticated;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.categories TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.categories TO authenticated;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,DELETE ON TABLE public.notifications TO authenticated;


--
-- Name: COLUMN notifications.read_at; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(read_at) ON TABLE public.notifications TO authenticated;


--
-- Name: TABLE posts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.posts TO anon;
GRANT SELECT,DELETE ON TABLE public.posts TO authenticated;


--
-- Name: COLUMN posts.topic_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(topic_id) ON TABLE public.posts TO authenticated;


--
-- Name: COLUMN posts.body; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(body),UPDATE(body) ON TABLE public.posts TO authenticated;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles.username; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(username) ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles.display_name; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(display_name) ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles.avatar_url; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(avatar_url) ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles.bio; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(bio) ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles.interests; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(interests) ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles.github_url; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(github_url) ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles.linkedin_url; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(linkedin_url) ON TABLE public.profiles TO authenticated;


--
-- Name: COLUMN profiles.preferred_locale; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(preferred_locale) ON TABLE public.profiles TO authenticated;


--
-- Name: TABLE public_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.public_profiles TO anon;
GRANT SELECT ON TABLE public.public_profiles TO authenticated;


--
-- Name: TABLE reports; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.reports TO authenticated;


--
-- Name: COLUMN reports.topic_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(topic_id) ON TABLE public.reports TO authenticated;


--
-- Name: COLUMN reports.post_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(post_id) ON TABLE public.reports TO authenticated;


--
-- Name: COLUMN reports.resource_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(resource_id) ON TABLE public.reports TO authenticated;


--
-- Name: COLUMN reports.profile_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(profile_id) ON TABLE public.reports TO authenticated;


--
-- Name: COLUMN reports.reason; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(reason) ON TABLE public.reports TO authenticated;


--
-- Name: COLUMN reports.details; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(details) ON TABLE public.reports TO authenticated;


--
-- Name: TABLE resources; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.resources TO anon;
GRANT SELECT,DELETE ON TABLE public.resources TO authenticated;


--
-- Name: COLUMN resources.name; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(name),UPDATE(name) ON TABLE public.resources TO authenticated;


--
-- Name: COLUMN resources.description; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(description),UPDATE(description) ON TABLE public.resources TO authenticated;


--
-- Name: COLUMN resources.category_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(category_id),UPDATE(category_id) ON TABLE public.resources TO authenticated;


--
-- Name: COLUMN resources.type; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(type),UPDATE(type) ON TABLE public.resources TO authenticated;


--
-- Name: COLUMN resources.url; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(url),UPDATE(url) ON TABLE public.resources TO authenticated;


--
-- Name: COLUMN resources.language; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(language),UPDATE(language) ON TABLE public.resources TO authenticated;


--
-- Name: COLUMN resources.difficulty; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(difficulty),UPDATE(difficulty) ON TABLE public.resources TO authenticated;


--
-- Name: COLUMN resources.author_name; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(author_name),UPDATE(author_name) ON TABLE public.resources TO authenticated;


--
-- Name: TABLE tags; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.tags TO anon;
GRANT SELECT,DELETE ON TABLE public.tags TO authenticated;


--
-- Name: COLUMN tags.slug; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(slug) ON TABLE public.tags TO authenticated;


--
-- Name: COLUMN tags.name; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(name),UPDATE(name) ON TABLE public.tags TO authenticated;


--
-- Name: TABLE topic_tags; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.topic_tags TO anon;
GRANT SELECT,DELETE ON TABLE public.topic_tags TO authenticated;


--
-- Name: COLUMN topic_tags.topic_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(topic_id) ON TABLE public.topic_tags TO authenticated;


--
-- Name: COLUMN topic_tags.tag_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(tag_id) ON TABLE public.topic_tags TO authenticated;


--
-- Name: TABLE topics; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.topics TO anon;
GRANT SELECT,DELETE ON TABLE public.topics TO authenticated;


--
-- Name: COLUMN topics.category_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(category_id),UPDATE(category_id) ON TABLE public.topics TO authenticated;


--
-- Name: COLUMN topics.title; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(title),UPDATE(title) ON TABLE public.topics TO authenticated;


--
-- Name: COLUMN topics.body; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(body),UPDATE(body) ON TABLE public.topics TO authenticated;


--
-- Name: TABLE votes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,DELETE ON TABLE public.votes TO authenticated;


--
-- Name: COLUMN votes.post_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(post_id) ON TABLE public.votes TO authenticated;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: postgres
--

GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO service_role;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: postgres
--

GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict JTrYFwnMqm2YE7Un3phvvHdYTUazVjHwRoXLaNOYkUSRDxx5yq4F1cUs9guITO4

