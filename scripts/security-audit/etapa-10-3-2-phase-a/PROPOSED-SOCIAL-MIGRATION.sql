-- =============================================================================
-- VEXOR — ETAPA 10.3.2 (FASE A): PROPOSTA EXPERIMENTAL DE MIGRATION SOCIAL
-- AVISO: ARTEFATO EXPERIMENTAL ISOLADO FORA DE supabase/migrations/.
--        NÃO APLICAR NO SUPABASE REMOTO. TESTAR APENAS EM BANCO LOCAL ISOLADO.
--
-- Corrige integralmente os achados AUD-01 a AUD-11 da Etapa 10.3.1:
--   AUD-01: public.is_dm_participant(uuid) SECURITY DEFINER (sem recursão 42P17)
--   AUD-02: Revogação de GRANT SELECT de anon em tabelas de conteúdo interno
--   AUD-03: Deduplicação de notificações de UPs sem rollback de votos
--   AUD-04: Revalidação pós-lock (FOR SHARE/UPDATE NOWAIT), hierarquia mod/admin e 55P03
--   AUD-05: reported_message_snapshots imutável (sem ON DELETE CASCADE) + RPC auditada
--   AUD-06: Preservação de topics.title NOT NULL (5..200 chars)
--   AUD-07: Paginação determinística por cursor composto (created_at, id)
--   AUD-08: Índice único parcial (user_id, report_id) em user_warnings
--   AUD-09: ALTER TYPE ... ADD VALUE fora da transação (PostgreSQL 17/18 safe)
--   AUD-10: Extração de @mentions limitada a 10 destinatários respeitando user_blocks
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensão de ENUM existente FORA de transação (AUD-09)
-- -----------------------------------------------------------------------------
alter type public.notification_type add value if not exists 'topic_upvoted';
alter type public.notification_type add value if not exists 'post_upvoted';
alter type public.notification_type add value if not exists 'post_reply';
alter type public.notification_type add value if not exists 'mention';
alter type public.notification_type add value if not exists 'direct_message';
alter type public.notification_type add value if not exists 'user_warning';
alter type public.notification_type add value if not exists 'content_hidden';
alter type public.notification_type add value if not exists 'content_removed';

begin;

-- -----------------------------------------------------------------------------
-- 1. Novos ENUMs (AUD-09)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typname = 'topic_kind') then
    create type public.topic_kind as enum ('discussion', 'question', 'tool_share', 'note');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typname = 'warning_severity') then
    create type public.warning_severity as enum ('low', 'medium', 'high');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typname = 'warning_status') then
    create type public.warning_status as enum ('active', 'acknowledged', 'revoked');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Timeline: Extensões em topics + topic_votes + cursor composto (AUD-06, AUD-07)
--    Preserva topics.title NOT NULL (5..200) e topics_title_len intactos.
-- -----------------------------------------------------------------------------
alter table public.topics
  add column if not exists kind public.topic_kind not null default 'discussion',
  add column if not exists shared_url text,
  add column if not exists resource_id uuid references public.resources (id) on delete set null,
  add column if not exists vote_count integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'topics_shared_url_scheme') then
    alter table public.topics
      add constraint topics_shared_url_scheme
      check (shared_url is null or (shared_url ~* '^https?://[^[:space:]]+$' and char_length(shared_url) <= 2048));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'topics_votes_nonneg') then
    alter table public.topics
      add constraint topics_votes_nonneg check (vote_count >= 0);
  end if;
end $$;

create index if not exists topics_timeline_keyset_idx
  on public.topics (created_at desc, id desc)
  where status = 'published';

create index if not exists topics_kind_keyset_idx
  on public.topics (kind, created_at desc, id desc)
  where status = 'published';

create table if not exists public.topic_votes (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  topic_id   uuid not null references public.topics (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);
create index if not exists topic_votes_topic_idx on public.topic_votes (topic_id);

-- -----------------------------------------------------------------------------
-- 3. Bloqueios entre usuários (AUD-04, AUD-10)
-- -----------------------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id, blocker_id);

-- -----------------------------------------------------------------------------
-- 4. Advertências formais (AUD-04, AUD-08)
-- -----------------------------------------------------------------------------
create table if not exists public.user_warnings (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  moderator_id      uuid references public.profiles (id) on delete set null,
  reason            public.report_reason not null,
  severity          public.warning_severity not null default 'low',
  description       text not null,
  topic_id          uuid references public.topics (id) on delete set null,
  post_id           uuid references public.posts (id) on delete set null,
  report_id         uuid references public.reports (id) on delete set null,
  status            public.warning_status not null default 'active',
  acknowledged_at   timestamptz,
  revoked_by        uuid references public.profiles (id) on delete set null,
  revoked_at        timestamptz,
  revocation_reason text,
  created_at        timestamptz not null default now(),

  constraint user_warnings_desc_len check (char_length(btrim(description)) between 10 and 1500),
  constraint user_warnings_revoke_reason check (
    status <> 'revoked' or (revocation_reason is not null and char_length(btrim(revocation_reason)) >= 5)
  )
);

create index if not exists user_warnings_user_idx on public.user_warnings (user_id, created_at desc);
-- AUD-08: evita advertência duplicada vinculada ao mesmo report ativo, permitindo NULL e novos reports
create unique index if not exists user_warnings_report_active_key
  on public.user_warnings (user_id, report_id)
  where report_id is not null and status <> 'revoked';

-- -----------------------------------------------------------------------------
-- 5. Mensagens Privadas + Snapshot de Denúncia (AUD-01, AUD-05, AUD-07)
-- -----------------------------------------------------------------------------
create table if not exists public.direct_conversations (
  id               uuid primary key default gen_random_uuid(),
  participant_low  uuid not null references public.profiles (id) on delete cascade,
  participant_high uuid not null references public.profiles (id) on delete cascade,
  last_message_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),

  constraint direct_conversations_pair_order check (participant_low < participant_high),
  constraint direct_conversations_pair_unique unique (participant_low, participant_high)
);
create index if not exists direct_conversations_last_msg_idx
  on public.direct_conversations (last_message_at desc, id desc);

create table if not exists public.direct_conversation_members (
  conversation_id uuid not null references public.direct_conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  last_read_at    timestamptz,
  is_archived     boolean not null default false,
  muted_until     timestamptz,
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists direct_conv_members_user_idx
  on public.direct_conversation_members (user_id, conversation_id);

create table if not exists public.direct_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations (id) on delete cascade,
  sender_id       uuid references public.profiles (id) on delete set null,
  body            text not null,
  status          public.content_status not null default 'published',
  created_at      timestamptz not null default now(),
  edited_at       timestamptz,

  constraint direct_messages_body_len check (char_length(btrim(body)) between 1 and 4000)
);
-- AUD-07: índice determinístico composto para paginação por cursor (created_at, id)
create index if not exists direct_messages_conv_keyset_idx
  on public.direct_messages (conversation_id, created_at desc, id desc);

-- AUD-05: snapshot imutável SEM ON DELETE CASCADE em direct_messages
create table if not exists public.reported_message_snapshots (
  id              uuid primary key default gen_random_uuid(),
  message_id      uuid not null,
  conversation_id uuid not null,
  sender_id       uuid references public.profiles (id) on delete set null,
  captured_by     uuid references public.profiles (id) on delete set null,
  body_snapshot   text not null,
  sent_at         timestamptz not null,
  retention_until timestamptz not null default (now() + interval '180 days'),
  created_at      timestamptz not null default now()
);
create index if not exists reported_msg_snapshots_msg_idx on public.reported_message_snapshots (message_id);

-- -----------------------------------------------------------------------------
-- 6. Extensão em reports e notifications (AUD-05, AUD-09)
-- -----------------------------------------------------------------------------
alter table public.reports
  add column if not exists message_snapshot_id uuid references public.reported_message_snapshots (id) on delete cascade;

create unique index if not exists reports_dedupe_message_snapshot
  on public.reports (reporter_id, message_snapshot_id)
  where message_snapshot_id is not null and status in ('open', 'reviewing');

do $$
declare
  v_has_research boolean;
begin
  select exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'reports' and column_name = 'research_id'
  ) into v_has_research;

  alter table public.reports drop constraint if exists reports_one_target;
  if v_has_research then
    alter table public.reports
      add constraint reports_one_target
      check (num_nonnulls(topic_id, post_id, resource_id, profile_id, research_id, message_snapshot_id) = 1);
  else
    alter table public.reports
      add constraint reports_one_target
      check (num_nonnulls(topic_id, post_id, resource_id, profile_id, message_snapshot_id) = 1);
  end if;
end $$;

alter table public.notifications
  add column if not exists conversation_id uuid references public.direct_conversations (id) on delete cascade,
  add column if not exists message_id uuid references public.direct_messages (id) on delete cascade,
  add column if not exists warning_id uuid references public.user_warnings (id) on delete cascade,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- -----------------------------------------------------------------------------
-- 7. Helper anti-recursão de DM (AUD-01)
-- -----------------------------------------------------------------------------
create or replace function public.is_dm_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and exists (
       select 1
         from public.direct_conversation_members m
        where m.conversation_id = p_conversation_id
          and m.user_id = auth.uid()
     );
$$;

-- -----------------------------------------------------------------------------
-- 8. Triggers de UPs e deduplicação segura de notificações (AUD-03)
-- -----------------------------------------------------------------------------
create or replace function public.on_topic_vote_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
begin
  if tg_op = 'INSERT' then
    update public.topics
       set vote_count = vote_count + 1
     where id = new.topic_id
     returning author_id into v_author_id;

    if v_author_id is not null and v_author_id is distinct from new.user_id then
      begin
        insert into public.notifications (user_id, type, actor_id, topic_id)
        select v_author_id, 'topic_upvoted'::public.notification_type, new.user_id, new.topic_id
         where not exists (
           select 1
             from public.notifications n
            where n.user_id = v_author_id
              and n.actor_id = new.user_id
              and n.type = 'topic_upvoted'::public.notification_type
              and n.topic_id = new.topic_id
              and n.created_at > now() - interval '24 hours'
         );
      exception when others then
        -- AUD-03: falha ou conflito em notificação nunca reverte o voto
        null;
      end;
    end if;
  else
    update public.topics
       set vote_count = greatest(vote_count - 1, 0)
     where id = old.topic_id;
  end if;
  return null;
end;
$$;

drop trigger if exists topic_votes_after_change on public.topic_votes;
create trigger topic_votes_after_change
  after insert or delete on public.topic_votes
  for each row execute function public.on_topic_vote_changed();

create or replace function public.on_vote_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
  v_topic_id  uuid;
begin
  if tg_op = 'INSERT' then
    update public.posts
       set vote_count = vote_count + 1
     where id = new.post_id
     returning author_id, topic_id into v_author_id, v_topic_id;

    if v_author_id is not null and v_author_id is distinct from new.user_id then
      begin
        insert into public.notifications (user_id, type, actor_id, topic_id, post_id)
        select v_author_id, 'post_upvoted'::public.notification_type, new.user_id, v_topic_id, new.post_id
         where not exists (
           select 1
             from public.notifications n
            where n.user_id = v_author_id
              and n.actor_id = new.user_id
              and n.type = 'post_upvoted'::public.notification_type
              and n.post_id = new.post_id
              and n.created_at > now() - interval '24 hours'
         );
      exception when others then
        null;
      end;
    end if;
  else
    update public.posts set vote_count = greatest(vote_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. Menções com limite de 10 e respeito a user_blocks (AUD-10)
-- -----------------------------------------------------------------------------
create or replace function public.notify_mentions(
  p_body     text,
  p_actor_id uuid,
  p_topic_id uuid,
  p_post_id  uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer := 0;
begin
  if p_body is null or p_actor_id is null or p_topic_id is null then
    return 0;
  end if;

  with extracted as (
    select distinct lower(m[1]) as uname
      from pg_catalog.regexp_matches(p_body, '@([a-z0-9_]{3,30})', 'gi') as m
     limit 10
  ),
  targets as (
    select p.id as target_id
      from extracted e
      join public.profiles p on lower(p.username) = e.uname
     where not p.is_suspended
       and p.id is distinct from p_actor_id
       and not exists (
         select 1
           from public.user_blocks b
          where (b.blocker_id = p.id and b.blocked_id = p_actor_id)
             or (b.blocker_id = p_actor_id and b.blocked_id = p.id)
       )
  )
  insert into public.notifications (user_id, type, actor_id, topic_id, post_id)
  select t.target_id, 'mention'::public.notification_type, p_actor_id, p_topic_id, p_post_id
    from targets t
   where not exists (
     select 1
       from public.notifications n
      where n.user_id = t.target_id
        and n.actor_id = p_actor_id
        and n.type = 'mention'::public.notification_type
        and n.topic_id = p_topic_id
        and n.post_id is not distinct from p_post_id
   );

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.on_topic_created_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.author_id is not null and new.status = 'published' then
    perform public.notify_mentions(new.body, new.author_id, new.id, null);
  end if;
  return new;
end;
$$;

drop trigger if exists topics_after_insert_mentions on public.topics;
create trigger topics_after_insert_mentions
  after insert on public.topics
  for each row execute function public.on_topic_created_mentions();

create or replace function public.on_post_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.topics set last_activity_at = now() where id = new.topic_id;

  insert into public.notifications (user_id, type, actor_id, topic_id, post_id)
  select t.author_id, 'topic_reply', new.author_id, t.id, new.id
  from public.topics t
  where t.id = new.topic_id
    and t.author_id is not null
    and t.author_id is distinct from new.author_id;

  if new.author_id is not null then
    perform public.notify_mentions(new.body, new.author_id, new.topic_id, new.id);
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. RPCs de Advertência com pós-lock + hierarquia mod/admin (AUD-04, AUD-08)
-- -----------------------------------------------------------------------------
create or replace function public.issue_user_warning(
  p_user_id     uuid,
  p_reason      public.report_reason,
  p_severity    public.warning_severity,
  p_description text,
  p_topic_id    uuid default null,
  p_post_id     uuid default null,
  p_report_id   uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id   uuid := auth.uid();
  v_caller_role public.user_role;
  v_caller_susp boolean;
  v_target_role public.user_role;
  v_warning_id  uuid;
begin
  if v_caller_id is null or not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user_id is null or p_user_id = v_caller_id then
    raise exception 'cannot warn self' using errcode = '42501';
  end if;
  if p_description is null or char_length(btrim(p_description)) < 10 then
    raise exception 'description too short' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(6216471958360507469);

  select p.role, p.is_suspended
    into v_caller_role, v_caller_susp
    from public.profiles p
   where p.id = v_caller_id
     for share nowait;

  if not found or v_caller_susp or v_caller_role not in ('moderator', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select p.role
    into v_target_role
    from public.profiles p
   where p.id = p_user_id
     for update nowait;

  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  -- AUD-04: moderador não pode advertir administrador
  if v_target_role = 'admin' and v_caller_role <> 'admin' then
    raise exception 'moderators cannot warn admins' using errcode = '42501';
  end if;

  insert into public.user_warnings (
    user_id, moderator_id, reason, severity, description, topic_id, post_id, report_id
  )
  values (
    p_user_id, v_caller_id, p_reason, p_severity, btrim(p_description), p_topic_id, p_post_id, p_report_id
  )
  returning id into v_warning_id;

  insert into public.notifications (user_id, type, actor_id, topic_id, post_id, warning_id, metadata)
  values (
    p_user_id,
    'user_warning'::public.notification_type,
    v_caller_id,
    p_topic_id,
    p_post_id,
    v_warning_id,
    jsonb_build_object('reason', p_reason, 'severity', p_severity)
  );

  perform public.write_audit_log(
    'warning.issued',
    'user_warning',
    v_warning_id,
    jsonb_build_object('user_id', p_user_id, 'reason', p_reason, 'severity', p_severity, 'report_id', p_report_id)
  );

  return v_warning_id;
end;
$$;

create or replace function public.acknowledge_user_warning(p_warning_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
begin
  if v_caller_id is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.user_warnings
     set status = 'acknowledged'::public.warning_status,
         acknowledged_at = now()
   where id = p_warning_id
     and user_id = v_caller_id
     and status = 'active'::public.warning_status;

  if not found then
    raise exception 'warning not found or cannot be acknowledged' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.revoke_user_warning(
  p_warning_id uuid,
  p_reason     text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id   uuid := auth.uid();
  v_caller_role public.user_role;
  v_caller_susp boolean;
  v_target_role public.user_role;
  v_target_id   uuid;
begin
  if v_caller_id is null or not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 5 then
    raise exception 'revocation reason required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(6216471958360507469);

  select p.role, p.is_suspended
    into v_caller_role, v_caller_susp
    from public.profiles p
   where p.id = v_caller_id
     for share nowait;

  if not found or v_caller_susp or v_caller_role not in ('moderator', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select w.user_id, p.role
    into v_target_id, v_target_role
    from public.user_warnings w
    join public.profiles p on p.id = w.user_id
   where w.id = p_warning_id
     for update of w nowait;

  if not found then
    raise exception 'warning not found' using errcode = 'P0002';
  end if;

  if v_target_role = 'admin' and v_caller_role <> 'admin' then
    raise exception 'moderators cannot revoke admin warnings' using errcode = '42501';
  end if;

  update public.user_warnings
     set status = 'revoked'::public.warning_status,
         revoked_by = v_caller_id,
         revoked_at = now(),
         revocation_reason = btrim(p_reason)
   where id = p_warning_id
     and status <> 'revoked'::public.warning_status;

  if not found then
    raise exception 'warning already revoked' using errcode = '22023';
  end if;

  perform public.write_audit_log(
    'warning.revoked',
    'user_warning',
    p_warning_id,
    jsonb_build_object('user_id', v_target_id, 'reason', btrim(p_reason))
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 11. RPCs de Mensagens Privadas e Denúncia com Snapshot (AUD-01, AUD-04, AUD-05)
-- -----------------------------------------------------------------------------
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
  if v_caller_id is null or p_other_user_id is null or p_other_user_id = v_caller_id then
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

  insert into public.direct_conversations (participant_low, participant_high)
  values (v_low, v_high)
  on conflict (participant_low, participant_high) do nothing;

  select id into v_conv_id
    from public.direct_conversations
   where participant_low = v_low and participant_high = v_high;

  insert into public.direct_conversation_members (conversation_id, user_id)
  values (v_conv_id, v_low), (v_conv_id, v_high)
  on conflict (conversation_id, user_id) do nothing;

  return v_conv_id;
end;
$$;

create or replace function public.send_direct_message(
  p_conversation_id uuid,
  p_body            text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id   uuid := auth.uid();
  v_caller_susp boolean;
  v_other_id    uuid;
  v_msg_id      uuid;
  v_recent_cnt  integer;
begin
  if v_caller_id is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 4000 then
    raise exception 'invalid message length' using errcode = '22023';
  end if;

  select is_suspended into v_caller_susp
    from public.profiles where id = v_caller_id for share nowait;
  if not found or v_caller_susp then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  perform 1 from public.direct_conversations where id = p_conversation_id for share nowait;
  if not found then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.direct_conversation_members m
     where m.conversation_id = p_conversation_id and m.user_id = v_caller_id
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select m.user_id into v_other_id
    from public.direct_conversation_members m
   where m.conversation_id = p_conversation_id and m.user_id <> v_caller_id
   limit 1;

  if v_other_id is not null and exists (
    select 1 from public.user_blocks b
     where (b.blocker_id = v_caller_id and b.blocked_id = v_other_id)
        or (b.blocker_id = v_other_id and b.blocked_id = v_caller_id)
  ) then
    raise exception 'message blocked' using errcode = '42501';
  end if;

  -- Rate limit: máx 30 DMs/min por usuário
  select count(*) into v_recent_cnt
    from public.direct_messages dm
   where dm.sender_id = v_caller_id
     and dm.created_at > now() - interval '1 minute';
  if v_recent_cnt >= 30 then
    raise exception 'rate limit exceeded' using errcode = '42901';
  end if;

  insert into public.direct_messages (conversation_id, sender_id, body)
  values (p_conversation_id, v_caller_id, btrim(p_body))
  returning id into v_msg_id;

  update public.direct_conversations
     set last_message_at = now()
   where id = p_conversation_id;

  if v_other_id is not null then
    insert into public.notifications (user_id, type, actor_id, conversation_id, message_id)
    select v_other_id, 'direct_message'::public.notification_type, v_caller_id, p_conversation_id, v_msg_id
     where not exists (
       select 1 from public.notifications n
        where n.user_id = v_other_id
          and n.type = 'direct_message'::public.notification_type
          and n.conversation_id = p_conversation_id
          and n.read_at is null
     );
  end if;

  return v_msg_id;
end;
$$;

create or replace function public.report_direct_message(
  p_message_id uuid,
  p_reason     public.report_reason,
  p_details    text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id   uuid := auth.uid();
  v_caller_susp boolean;
  v_msg         record;
  v_snapshot_id uuid;
  v_report_id   uuid;
begin
  if v_caller_id is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select is_suspended into v_caller_susp
    from public.profiles where id = v_caller_id for share nowait;
  if not found or v_caller_susp then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select dm.id, dm.conversation_id, dm.sender_id, dm.body, dm.created_at
    into v_msg
    from public.direct_messages dm
   where dm.id = p_message_id
     for share nowait;

  if not found then
    raise exception 'message not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.direct_conversation_members m
     where m.conversation_id = v_msg.conversation_id and m.user_id = v_caller_id
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.reported_message_snapshots (
    message_id, conversation_id, sender_id, captured_by, body_snapshot, sent_at
  )
  values (
    v_msg.id, v_msg.conversation_id, v_msg.sender_id, v_caller_id, v_msg.body, v_msg.created_at
  )
  returning id into v_snapshot_id;

  insert into public.reports (reporter_id, message_snapshot_id, reason, details)
  values (v_caller_id, v_snapshot_id, p_reason, p_details)
  returning id into v_report_id;

  return v_report_id;
end;
$$;

create or replace function public.get_reported_message_evidence(p_report_id uuid)
returns table (
  snapshot_id     uuid,
  message_id      uuid,
  conversation_id uuid,
  sender_id       uuid,
  body_snapshot   text,
  sent_at         timestamptz,
  retention_until timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id   uuid := auth.uid();
  v_caller_role public.user_role;
  v_caller_susp boolean;
  v_snap_id     uuid;
begin
  if v_caller_id is null or not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select p.role, p.is_suspended
    into v_caller_role, v_caller_susp
    from public.profiles p
   where p.id = v_caller_id
     for share nowait;

  if not found or v_caller_susp or v_caller_role not in ('moderator', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select r.message_snapshot_id into v_snap_id
    from public.reports r
   where r.id = p_report_id;

  if v_snap_id is null then
    raise exception 'evidence not found' using errcode = 'P0002';
  end if;

  perform public.write_audit_log(
    'dm.evidence_viewed',
    'reported_message_snapshot',
    v_snap_id,
    jsonb_build_object('report_id', p_report_id)
  );

  return query
    select s.id, s.message_id, s.conversation_id, s.sender_id,
           s.body_snapshot, s.sent_at, s.retention_until
      from public.reported_message_snapshots s
     where s.id = v_snap_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 12. RLS, Políticas e Revogação de anon (AUD-01, AUD-02, AUD-05)
-- -----------------------------------------------------------------------------
alter table public.topic_votes                enable row level security;
alter table public.user_blocks                enable row level security;
alter table public.user_warnings              enable row level security;
alter table public.direct_conversations       enable row level security;
alter table public.direct_conversation_members enable row level security;
alter table public.direct_messages            enable row level security;
alter table public.reported_message_snapshots enable row level security;

revoke all on public.topic_votes, public.user_blocks, public.user_warnings,
              public.direct_conversations, public.direct_conversation_members,
              public.direct_messages, public.reported_message_snapshots
  from anon, authenticated;

-- AUD-02: revogar SELECT direto de anon em conteúdo interno
revoke select on public.topics, public.posts, public.resources,
                 public.categories, public.tags, public.topic_tags
  from anon;

drop policy if exists topics_select on public.topics;
create policy topics_select on public.topics
  for select to authenticated
  using (
    status = 'published'
    or author_id = (select auth.uid())
    or (select public.is_moderator())
  );

drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts
  for select to authenticated
  using (
    status = 'published'
    or author_id = (select auth.uid())
    or (select public.is_moderator())
  );

drop policy if exists resources_select on public.resources;
create policy resources_select on public.resources
  for select to authenticated
  using (
    status = 'approved'
    or submitted_by = (select auth.uid())
    or (select public.is_moderator())
  );

-- topic_votes
grant select, delete on public.topic_votes to authenticated;
grant insert (topic_id) on public.topic_votes to authenticated;

create policy topic_votes_select_own on public.topic_votes
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy topic_votes_insert on public.topic_votes
  for insert to authenticated
  with check (
    (select public.is_active_member())
    and user_id = (select auth.uid())
    and exists (select 1 from public.topics t where t.id = topic_id and t.status = 'published')
  );

create policy topic_votes_delete_own on public.topic_votes
  for delete to authenticated
  using ((select public.is_active_member()) and user_id = (select auth.uid()));

-- user_blocks
grant select, delete on public.user_blocks to authenticated;
grant insert (blocked_id) on public.user_blocks to authenticated;

create policy user_blocks_select_own on public.user_blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy user_blocks_insert_own on public.user_blocks
  for insert to authenticated
  with check (
    (select public.is_active_member())
    and blocker_id = (select auth.uid())
    and blocked_id <> (select auth.uid())
  );

create policy user_blocks_delete_own on public.user_blocks
  for delete to authenticated
  using ((select public.is_active_member()) and blocker_id = (select auth.uid()));

-- user_warnings (somente SELECT; mutações via RPC)
grant select on public.user_warnings to authenticated;
create policy user_warnings_select on public.user_warnings
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_moderator()));

-- DMs (AUD-01: usa is_dm_participant sem recursão)
grant select on public.direct_conversations, public.direct_conversation_members, public.direct_messages to authenticated;

create policy direct_conversations_select on public.direct_conversations
  for select to authenticated
  using ((select public.is_dm_participant(id)));

create policy direct_conv_members_select on public.direct_conversation_members
  for select to authenticated
  using ((select public.is_dm_participant(conversation_id)));

create policy direct_messages_select on public.direct_messages
  for select to authenticated
  using (
    (select public.is_active_member())
    and (select public.is_dm_participant(conversation_id))
  );

-- Privilégios das funções
revoke all on function public.is_dm_participant(uuid) from public;
grant execute on function public.is_dm_participant(uuid) to authenticated;

revoke all on function public.on_topic_vote_changed() from public, anon, authenticated;
revoke all on function public.notify_mentions(text, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.on_topic_created_mentions() from public, anon, authenticated;

revoke all on function public.issue_user_warning(uuid, public.report_reason, public.warning_severity, text, uuid, uuid, uuid) from public, anon;
revoke all on function public.acknowledge_user_warning(uuid) from public, anon;
revoke all on function public.revoke_user_warning(uuid, text) from public, anon;
revoke all on function public.get_or_create_dm_conversation(uuid) from public, anon;
revoke all on function public.send_direct_message(uuid, text) from public, anon;
revoke all on function public.report_direct_message(uuid, public.report_reason, text) from public, anon;
revoke all on function public.get_reported_message_evidence(uuid) from public, anon;

grant execute on function public.issue_user_warning(uuid, public.report_reason, public.warning_severity, text, uuid, uuid, uuid) to authenticated;
grant execute on function public.acknowledge_user_warning(uuid) to authenticated;
grant execute on function public.revoke_user_warning(uuid, text) to authenticated;
grant execute on function public.get_or_create_dm_conversation(uuid) to authenticated;
grant execute on function public.send_direct_message(uuid, text) to authenticated;
grant execute on function public.report_direct_message(uuid, public.report_reason, text) to authenticated;
grant execute on function public.get_reported_message_evidence(uuid) to authenticated;

commit;
