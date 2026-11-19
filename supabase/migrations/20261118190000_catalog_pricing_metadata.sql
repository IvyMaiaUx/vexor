-- =============================================================================
-- VEXOR — MIGRATION CANDIDATA: METADADOS DE PREÇO, CARTÃO E TAGS EM RESOURCES
-- Alvo: public.resources (PostgreSQL 17.11 / Supabase)
-- Preserva recursos históricos (colunas opcionais com NULL seguro / tags='{}')
-- e garante geração/sanitização server-side das tags automáticas via trigger.
-- =============================================================================

begin;

alter table public.resources
  add column if not exists pricing_model text,
  add column if not exists requires_credit_card text,
  add column if not exists free_tier_limits text,
  add column if not exists pricing_notes text,
  add column if not exists tags text[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'resources_pricing_model_check') then
    alter table public.resources
      add constraint resources_pricing_model_check
      check (pricing_model is null or pricing_model in ('free', 'freemium', 'paid'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'resources_credit_card_check') then
    alter table public.resources
      add constraint resources_credit_card_check
      check (requires_credit_card is null or requires_credit_card in ('yes', 'no', 'depends', 'not_informed'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'resources_free_tier_limits_len') then
    alter table public.resources
      add constraint resources_free_tier_limits_len
      check (free_tier_limits is null or char_length(btrim(free_tier_limits)) <= 1000);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'resources_pricing_notes_len') then
    alter table public.resources
      add constraint resources_pricing_notes_len
      check (pricing_notes is null or char_length(btrim(pricing_notes)) <= 500);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'resources_tags_valid_check') then
    alter table public.resources
      add constraint resources_tags_valid_check
      check (
        cardinality(tags) <= 6
        and tags <@ array[
          'free',
          'freemium',
          'paid',
          'no_card',
          'card_required',
          'card_depends',
          'card_not_informed',
          'open_source',
          'self_hosted'
        ]::text[]
      );
  end if;
end $$;

create index if not exists resources_pricing_idx
  on public.resources (pricing_model, requires_credit_card)
  where status = 'approved';

create index if not exists resources_tags_gin
  on public.resources using gin (tags);

-- Trigger que impede adulteração manual das tags automáticas e sanitiza textos opcionais
create or replace function public.resources_sync_pricing_tags()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tags text[] := '{}';
  v_card_tag text;
begin
  if new.free_tier_limits is not null and btrim(new.free_tier_limits) = '' then
    new.free_tier_limits := null;
  elsif new.free_tier_limits is not null then
    new.free_tier_limits := btrim(new.free_tier_limits);
  end if;

  if new.pricing_notes is not null and btrim(new.pricing_notes) = '' then
    new.pricing_notes := null;
  elsif new.pricing_notes is not null then
    new.pricing_notes := btrim(new.pricing_notes);
  end if;

  if new.pricing_model is not null then
    v_tags := array_append(v_tags, new.pricing_model);
  end if;

  if new.requires_credit_card is not null then
    v_card_tag := case new.requires_credit_card
      when 'no' then 'no_card'
      when 'yes' then 'card_required'
      when 'depends' then 'card_depends'
      when 'not_informed' then 'card_not_informed'
    end;
    if v_card_tag is not null then
      v_tags := array_append(v_tags, v_card_tag);
    end if;
  end if;

  -- Preserva apenas as tags complementares permitidas enviadas pelo usuário
  if new.tags is not null then
    if 'open_source' = any(new.tags) then
      v_tags := array_append(v_tags, 'open_source');
    end if;
    if 'self_hosted' = any(new.tags) then
      v_tags := array_append(v_tags, 'self_hosted');
    end if;
  end if;

  new.tags := v_tags;
  return new;
end;
$$;

drop trigger if exists resources_before_write_sync_tags on public.resources;
create trigger resources_before_write_sync_tags
  before insert or update of pricing_model, requires_credit_card, free_tier_limits, pricing_notes, tags
  on public.resources
  for each row execute function public.resources_sync_pricing_tags();

revoke all on function public.resources_sync_pricing_tags() from public, anon, authenticated;

-- Concede apenas escrita por coluna nos novos metadados (status, slug, submitted_by, reviewed_* continuam bloqueados)
grant insert (pricing_model, requires_credit_card, free_tier_limits, pricing_notes, tags)
  on public.resources to authenticated;

grant update (pricing_model, requires_credit_card, free_tier_limits, pricing_notes, tags)
  on public.resources to authenticated;

commit;
