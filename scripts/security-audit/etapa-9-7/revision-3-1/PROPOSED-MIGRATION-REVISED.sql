-- =============================================================================
-- VEXOR — Etapa 9.7 (Revisão 3.1) — PROPOSTA TEXTUAL DE MIGRATION
-- Base: revision-3/PROPOSED-MIGRATION-REVISED.sql + correção pontual de role NULL
-- ATENÇÃO: Artefato exclusivo de planejamento e auditoria.
-- NÃO EXECUTADO, NÃO APLICADO ao banco local nem remoto.
-- =============================================================================

-- 1. Novos ENUMs e extensões de tipos existentes
create type public.research_status   as enum ('pending', 'approved', 'rejected', 'archived');
create type public.research_domain   as enum (
  'malware', 'ransomware', 'apt', 'darkweb', 'fraud', 'botnets', 'identity', 'legal'
);
create type public.research_severity as enum ('critical', 'high', 'medium', 'info');
create type public.research_tlp      as enum ('CLEAR', 'GREEN', 'AMBER', 'AMBER+', 'RED');

alter type public.category_scope    add value if not exists 'research';
alter type public.notification_type add value if not exists 'research_approved';
alter type public.notification_type add value if not exists 'research_rejected';

-- 2. Função auxiliar imutável para validação estrita de arrays (CVEs / ATT&CK)
--    Rejeita: array NULL, multidimensional, elementos NULL, duplicidades, formato inválido e excesso de itens.
create or replace function public.research_valid_code_array(
  p_items   text[],
  p_pattern text,
  p_max_len integer
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    p_items is not null
    and (array_ndims(p_items) is null or array_ndims(p_items) = 1)
    and cardinality(p_items) <= p_max_len
    and not exists (
      select 1
        from unnest(p_items) as elem
       where elem is null or elem !~ p_pattern
    )
    and (
      select count(distinct elem) = cardinality(p_items)
        from unnest(p_items) as elem
    );
$$;

-- 3. Tabela principal
create table public.research_submissions (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  author_id          uuid references public.profiles (id) on delete set null default auth.uid(),
  category_id        uuid not null references public.categories (id) on delete restrict,
  title_pt           text not null,
  title_en           text,
  summary_pt         text not null,
  summary_en         text,
  body_pt            text not null,
  body_en            text,
  domain             public.research_domain not null,
  severity           public.research_severity not null default 'medium',
  tlp                public.research_tlp not null default 'CLEAR',
  status             public.research_status not null default 'pending',
  cves               text[] not null default '{}',
  attack_techniques  text[] not null default '{}',
  source_references  jsonb not null default '[]'::jsonb,
  confidence_level   text,
  methodology        text,
  read_time_minutes  integer not null default 10,
  rejection_reason   text,
  reviewed_by        uuid references public.profiles (id) on delete set null,
  reviewed_at        timestamptz,
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint research_slug_format      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint research_title_pt_len     check (char_length(btrim(title_pt)) between 5 and 180),
  constraint research_title_en_len     check (title_en is null or char_length(btrim(title_en)) between 5 and 180),
  constraint research_summary_pt_len   check (char_length(btrim(summary_pt)) between 20 and 1000),
  constraint research_summary_en_len   check (summary_en is null or char_length(btrim(summary_en)) between 20 and 1000),
  constraint research_body_pt_len      check (char_length(btrim(body_pt)) between 20 and 50000),
  constraint research_body_en_len      check (body_en is null or char_length(btrim(body_en)) between 20 and 50000),
  constraint research_read_time_range  check (read_time_minutes between 1 and 180),
  constraint research_cves_valid       check (public.research_valid_code_array(cves, '^CVE-[0-9]{4}-[0-9]{4,7}$', 20)),
  constraint research_techniques_valid check (public.research_valid_code_array(attack_techniques, '^T[0-9]{4}(\.[0-9]{3})?$', 30)),
  constraint research_refs_array       check (jsonb_typeof(source_references) = 'array' and jsonb_array_length(source_references) <= 20),
  constraint research_confidence_valid check (confidence_level is null or confidence_level in ('low', 'medium', 'high')),
  constraint research_methodology_len  check (methodology is null or char_length(btrim(methodology)) between 10 and 2000),
  constraint research_rejection_len    check (rejection_reason is null or char_length(btrim(rejection_reason)) between 5 and 1000)
);

create index research_status_pub_idx on public.research_submissions (status, published_at desc);
create index research_author_idx     on public.research_submissions (author_id, created_at desc);
create index research_cat_dom_idx    on public.research_submissions (category_id, domain, severity);
create index research_techniques_gin on public.research_submissions using gin (attack_techniques);
create index research_cves_gin       on public.research_submissions using gin (cves);

-- 4. Tabela de destinatários autorizados para TLP restrito (AMBER / AMBER+ / RED)
create table public.research_recipients (
  research_id   uuid not null references public.research_submissions (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  granted_by    uuid references public.profiles (id) on delete set null,
  justification text,
  created_at    timestamptz not null default now(),

  primary key (research_id, user_id),
  constraint research_recipients_just_len check (
    justification is null or char_length(btrim(justification)) between 5 and 500
  )
);

create index research_recipients_user_idx
  on public.research_recipients (user_id, research_id);

-- 5. Triggers de slug, proteção de campos/autoria, contrato JSONB e updated_at
create or replace function public.research_set_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_base text;
begin
  v_base := trim(both '-' from regexp_replace(lower(extensions.unaccent(new.title_pt)), '[^a-z0-9]+', '-', 'g'));
  v_base := left(coalesce(nullif(v_base, ''), 'research'), 54);
  new.slug := v_base || '-' || substr(replace(new.id::text, '-', ''), 1, 8);
  return new;
end;
$$;

create or replace function public.research_protect_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_cat_valid boolean;
  v_ref       jsonb;
  v_key       text;
  v_url       text;
begin
  -- Validar categoria ativa compatível com research
  select exists (
    select 1 from public.categories c
    where c.id = new.category_id and c.is_active and c.scope in ('research', 'both')
  ) into v_cat_valid;
  if not v_cat_valid then
    raise exception 'invalid or inactive research category' using errcode = '22023';
  end if;

  -- Contrato estrito de source_references: array de objetos com chaves {title, url, isExternal}
  if jsonb_typeof(new.source_references) <> 'array'
     or jsonb_array_length(new.source_references) > 20 then
    raise exception 'invalid source_references array' using errcode = '22023';
  end if;

  for v_ref in select * from jsonb_array_elements(new.source_references) loop
    if jsonb_typeof(v_ref) <> 'object' then
      raise exception 'source reference entry must be an object' using errcode = '22023';
    end if;

    for v_key in select * from jsonb_object_keys(v_ref) loop
      if v_key not in ('title', 'url', 'isExternal') then
        raise exception 'unsupported source reference field: %', v_key using errcode = '22023';
      end if;
    end loop;

    if not (v_ref ? 'title')
       or jsonb_typeof(v_ref -> 'title') <> 'string'
       or char_length(btrim(v_ref ->> 'title')) not between 1 and 200 then
      raise exception 'invalid source reference title' using errcode = '22023';
    end if;

    if (v_ref ? 'url') and jsonb_typeof(v_ref -> 'url') <> 'null' then
      if jsonb_typeof(v_ref -> 'url') <> 'string' then
        raise exception 'source reference url must be a string' using errcode = '22023';
      end if;
      v_url := v_ref ->> 'url';
      if char_length(v_url) > 500 or v_url !~ '^https://[^[:space:]]+$' then
        raise exception 'source reference url must use https://' using errcode = '22023';
      end if;
    end if;

    if (v_ref ? 'isExternal')
       and jsonb_typeof(v_ref -> 'isExternal') not in ('boolean', 'null') then
      raise exception 'source reference isExternal must be boolean' using errcode = '22023';
    end if;
  end loop;

  if tg_op = 'INSERT' then
    new.author_id        := auth.uid();
    new.status           := 'pending'::public.research_status;
    new.rejection_reason := null;
    new.reviewed_by      := null;
    new.reviewed_at      := null;
    new.published_at     := null;
  elsif tg_op = 'UPDATE' then
    -- Imutabilidade incondicional de autoria e slug
    if new.author_id is distinct from old.author_id then
      raise exception 'author_id cannot be changed' using errcode = '42501';
    end if;
    if new.slug is distinct from old.slug then
      raise exception 'slug cannot be changed' using errcode = '42501';
    end if;

    -- Defesa em profundidade: clientes diretos (anon/authenticated) nunca alteram campos administrativos
    if current_user in ('anon', 'authenticated') then
      if new.status           is distinct from old.status
         or new.rejection_reason is distinct from old.rejection_reason
         or new.reviewed_by      is distinct from old.reviewed_by
         or new.reviewed_at      is distinct from old.reviewed_at
         or new.published_at     is distinct from old.published_at then
        raise exception 'administrative research fields cannot be modified directly' using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger research_before_insert_slug
  before insert on public.research_submissions
  for each row execute function public.research_set_slug();

create trigger research_protect_fields_trigger
  before insert or update on public.research_submissions
  for each row execute function public.research_protect_fields();

create trigger research_set_updated_at
  before update on public.research_submissions
  for each row execute function public.set_updated_at();

-- 6. Extensão histórica segura em reports e notifications
alter table public.reports
  add column if not exists research_id uuid references public.research_submissions (id) on delete restrict;

alter table public.reports
  drop constraint if exists reports_one_target;

alter table public.reports
  add constraint reports_one_target
  check (num_nonnulls(topic_id, post_id, resource_id, profile_id, research_id) = 1);

create unique index if not exists reports_dedupe_research
  on public.reports (reporter_id, research_id)
  where research_id is not null and status in ('open', 'reviewing');

create index if not exists reports_research_idx
  on public.reports (research_id)
  where research_id is not null;

-- Correção obrigatória da Revisão 3: conceder INSERT na nova coluna research_id
grant insert (research_id) on public.reports to authenticated;

-- Evita enumeração de pesquisas restritas/não publicadas via denúncia
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (select public.is_active_member())
    and status = 'open'
    and (
      research_id is null
      or exists (
        select 1 from public.research_submissions r
        where r.id = reports.research_id
      )
    )
  );

alter table public.notifications
  add column if not exists research_id uuid references public.research_submissions (id) on delete set null;

-- 7. RLS e Grants (menor privilégio)
alter table public.research_submissions enable row level security;
revoke all on public.research_submissions from public, anon, authenticated;

grant select on public.research_submissions to authenticated;
grant insert (
  category_id, title_pt, title_en, summary_pt, summary_en, body_pt, body_en,
  domain, severity, tlp, cves, attack_techniques, source_references,
  confidence_level, methodology, read_time_minutes
) on public.research_submissions to authenticated;
grant update (
  category_id, title_pt, title_en, summary_pt, summary_en, body_pt, body_en,
  domain, severity, tlp, cves, attack_techniques, source_references,
  confidence_level, methodology, read_time_minutes
) on public.research_submissions to authenticated;

create policy research_select on public.research_submissions
  for select to authenticated
  using (
    (
      (select public.is_active_member())
      and (
        author_id = (select auth.uid())
        or (
          status = 'approved'
          and (
            tlp in ('CLEAR', 'GREEN')
            or (
              tlp in ('AMBER', 'AMBER+', 'RED')
              and exists (
                select 1
                  from public.research_recipients rr
                 where rr.research_id = research_submissions.id
                   and rr.user_id = (select auth.uid())
              )
            )
          )
        )
      )
    )
    or (select public.is_moderator())
  );

create policy research_insert on public.research_submissions
  for insert to authenticated
  with check (
    (select public.is_active_member())
    and author_id = (select auth.uid())
    and status = 'pending'
  );

create policy research_update_own_pending on public.research_submissions
  for update to authenticated
  using (
    (select public.is_active_member())
    and author_id = (select auth.uid())
    and status = 'pending'
  )
  with check (
    (select public.is_active_member())
    and author_id = (select auth.uid())
    and status = 'pending'
  );

alter table public.research_recipients enable row level security;
revoke all on public.research_recipients from public, anon, authenticated;
grant select on public.research_recipients to authenticated;

create policy research_recipients_select on public.research_recipients
  for select to authenticated
  using (
    (
      (select public.is_active_member())
      and (
        user_id = (select auth.uid())
        or exists (
          select 1 from public.research_submissions r
          where r.id = research_recipients.research_id
            and r.author_id = (select auth.uid())
        )
      )
    )
    or (select public.is_moderator())
  );

-- 8. RPCs SECURITY DEFINER
create or replace function public.moderate_research(
  p_research_id uuid,
  p_decision    public.research_status,
  p_reason      text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id        uuid;
  v_prev_status      public.research_status;
  v_caller_role      public.user_role;
  v_caller_susp      boolean;
  v_recipient_active boolean;
  v_clean_reason     text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if auth.uid() is null or not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected', 'archived') then
    raise exception 'invalid decision: %', p_decision using errcode = '22023';
  end if;
  if p_decision = 'rejected' and (v_clean_reason is null or char_length(v_clean_reason) < 5) then
    raise exception 'a reason of at least 5 characters is required to reject research' using errcode = '22023';
  end if;

  select r.author_id, r.status into v_author_id, v_prev_status
    from public.research_submissions r
   where r.id = p_research_id
     for update;

  if not found then
    raise exception 'research not found' using errcode = 'P0002';
  end if;

  select p.role, p.is_suspended into v_caller_role, v_caller_susp
    from public.profiles p
   where p.id = auth.uid()
     for share nowait;

  if not found
     or v_caller_susp is distinct from false
     or v_caller_role is null
     or v_caller_role not in ('moderator', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_prev_status = p_decision then
    raise exception 'research is already in status %', p_decision using errcode = '22023';
  end if;
  if v_prev_status = 'archived' then
    raise exception 'archived research cannot transition directly to %', p_decision using errcode = '22023';
  end if;
  if v_prev_status in ('approved', 'rejected') and p_decision <> 'archived' then
    raise exception 'invalid status transition from % to %', v_prev_status, p_decision using errcode = '22023';
  end if;

  update public.research_submissions r
     set status           = p_decision,
         reviewed_by      = auth.uid(),
         reviewed_at      = now(),
         rejection_reason = case when p_decision = 'rejected' then v_clean_reason else null end,
         published_at     = case when p_decision = 'approved' then coalesce(r.published_at, now())
                                 else r.published_at end
   where r.id = p_research_id;

  perform public.write_audit_log(
    'research.' || p_decision::text,
    'research',
    p_research_id,
    jsonb_build_object(
      'from', v_prev_status,
      'to', p_decision,
      'reason', v_clean_reason
    )
  );

  if p_decision in ('approved', 'rejected')
     and v_author_id is not null
     and v_author_id <> auth.uid() then
    select not p.is_suspended into v_recipient_active
      from public.profiles p
     where p.id = v_author_id;

    if coalesce(v_recipient_active, false) then
      insert into public.notifications (user_id, type, actor_id, research_id)
      values (
        v_author_id,
        case when p_decision = 'approved'
             then 'research_approved'::public.notification_type
             else 'research_rejected'::public.notification_type end,
        auth.uid(),
        p_research_id
      );
    end if;
  end if;
end;
$$;

create or replace function public.resubmit_research(
  p_research_id       uuid,
  p_category_id       uuid,
  p_title_pt          text,
  p_summary_pt        text,
  p_body_pt           text,
  p_domain            public.research_domain,
  p_severity          public.research_severity,
  p_tlp               public.research_tlp,
  p_title_en          text default null,
  p_summary_en        text default null,
  p_body_en           text default null,
  p_cves              text[] default '{}',
  p_attack_techniques text[] default '{}',
  p_source_references jsonb default '[]'::jsonb,
  p_confidence_level  text default null,
  p_methodology       text default null,
  p_read_time_minutes integer default 10
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id   uuid;
  v_prev_status public.research_status;
  v_caller_role public.user_role;
  v_caller_susp boolean;
begin
  if auth.uid() is null or not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select r.author_id, r.status into v_author_id, v_prev_status
    from public.research_submissions r
   where r.id = p_research_id
     for update;

  if not found then
    raise exception 'research not found' using errcode = 'P0002';
  end if;

  select p.role, p.is_suspended into v_caller_role, v_caller_susp
    from public.profiles p
   where p.id = auth.uid()
     for share nowait;

  if not found or v_caller_susp is distinct from false or v_caller_role is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_author_id is null or v_author_id <> auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_prev_status <> 'rejected' then
    raise exception 'only rejected research can be resubmitted' using errcode = '22023';
  end if;

  update public.research_submissions
     set category_id       = p_category_id,
         title_pt          = p_title_pt,
         title_en          = p_title_en,
         summary_pt        = p_summary_pt,
         summary_en        = p_summary_en,
         body_pt           = p_body_pt,
         body_en           = p_body_en,
         domain            = p_domain,
         severity          = p_severity,
         tlp               = p_tlp,
         cves              = coalesce(p_cves, '{}'),
         attack_techniques = coalesce(p_attack_techniques, '{}'),
         source_references = coalesce(p_source_references, '[]'::jsonb),
         confidence_level  = p_confidence_level,
         methodology       = p_methodology,
         read_time_minutes = coalesce(p_read_time_minutes, 10),
         status            = 'pending',
         rejection_reason  = null,
         reviewed_by       = null,
         reviewed_at       = null
   where id = p_research_id;

  perform public.write_audit_log(
    'research.resubmitted',
    'research',
    p_research_id,
    jsonb_build_object('from', v_prev_status, 'to', 'pending')
  );
end;
$$;

create or replace function public.grant_research_recipient(
  p_research_id   uuid,
  p_user_id       uuid,
  p_justification text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tlp           public.research_tlp;
  v_caller_role   public.user_role;
  v_caller_susp   boolean;
  v_target_susp   boolean;
  v_clean_just    text := nullif(btrim(coalesce(p_justification, '')), '');
begin
  if auth.uid() is null or not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot grant recipient access to yourself' using errcode = '42501';
  end if;

  select r.tlp into v_tlp
    from public.research_submissions r
   where r.id = p_research_id
     for update;

  if not found then
    raise exception 'research not found' using errcode = 'P0002';
  end if;

  select p.role, p.is_suspended into v_caller_role, v_caller_susp
    from public.profiles p
   where p.id = auth.uid()
     for share nowait;

  if not found
     or v_caller_susp is distinct from false
     or v_caller_role is null
     or v_caller_role not in ('moderator', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_tlp in ('AMBER+', 'RED') and (v_clean_just is null or char_length(v_clean_just) < 5) then
    raise exception 'justification of at least 5 characters is required for AMBER+ or RED' using errcode = '22023';
  end if;

  select p.is_suspended into v_target_susp
    from public.profiles p
   where p.id = p_user_id;

  if not found or v_target_susp is distinct from false then
    raise exception 'recipient profile not found or suspended' using errcode = '22023';
  end if;

  insert into public.research_recipients (research_id, user_id, granted_by, justification)
  values (p_research_id, p_user_id, auth.uid(), v_clean_just)
  on conflict (research_id, user_id) do update
    set granted_by = excluded.granted_by,
        justification = excluded.justification;

  perform public.write_audit_log(
    'research.recipient_granted',
    'research',
    p_research_id,
    jsonb_build_object('recipient_id', p_user_id, 'tlp', v_tlp)
  );
end;
$$;

create or replace function public.revoke_research_recipient(
  p_research_id uuid,
  p_user_id     uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role public.user_role;
  v_caller_susp boolean;
begin
  if auth.uid() is null or not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  perform 1
    from public.research_submissions r
   where r.id = p_research_id
     for update;

  if not found then
    raise exception 'research not found' using errcode = 'P0002';
  end if;

  select p.role, p.is_suspended into v_caller_role, v_caller_susp
    from public.profiles p
   where p.id = auth.uid()
     for share nowait;

  if not found
     or v_caller_susp is distinct from false
     or v_caller_role is null
     or v_caller_role not in ('moderator', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.research_recipients
   where research_id = p_research_id
     and user_id = p_user_id;

  perform public.write_audit_log(
    'research.recipient_revoked',
    'research',
    p_research_id,
    jsonb_build_object('recipient_id', p_user_id)
  );
end;
$$;

-- Grants das RPCs
revoke all on function public.moderate_research(uuid, public.research_status, text) from public, anon;
grant execute on function public.moderate_research(uuid, public.research_status, text) to authenticated;

revoke all on function public.resubmit_research(
  uuid, uuid, text, text, text, public.research_domain, public.research_severity, public.research_tlp,
  text, text, text, text[], text[], jsonb, text, text, integer
) from public, anon;
grant execute on function public.resubmit_research(
  uuid, uuid, text, text, text, public.research_domain, public.research_severity, public.research_tlp,
  text, text, text, text[], text[], jsonb, text, text, integer
) to authenticated;

revoke all on function public.grant_research_recipient(uuid, uuid, text) from public, anon;
grant execute on function public.grant_research_recipient(uuid, uuid, text) to authenticated;

revoke all on function public.revoke_research_recipient(uuid, uuid) from public, anon;
grant execute on function public.revoke_research_recipient(uuid, uuid) to authenticated;

grant execute on function public.research_valid_code_array(text[], text, integer) to anon, authenticated;
