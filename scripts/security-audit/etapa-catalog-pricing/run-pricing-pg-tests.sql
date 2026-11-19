-- =============================================================================
-- VEXOR — TESTES PG LOCAL: 20261118190000_catalog_pricing_metadata.sql
-- =============================================================================
\set ON_ERROR_STOP on

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.local', '{"username":"alice","display_name":"Alice"}');

insert into public.categories (id, slug, name_en, name_pt, scope, sort_order) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'network-sec', 'Network Security', 'Segurança de Redes', 'both', 10)
on conflict (slug) do nothing;

do $$
declare
  v_legacy_id uuid;
  v_new_id    uuid;
  v_tags      text[];
  v_status    public.resource_status;
begin
  -- 1. Recurso legado inserido sem campos de preço permanece válido
  insert into public.resources (name, description, category_id, type, url, language, status)
  values ('Legacy Tool', 'Ferramenta legada sem metadados de preco.', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'tool', 'https://legacy.example.com', 'en', 'approved')
  returning id into v_legacy_id;

  -- 2. Submissão autenticada com novos campos + tentativa de forjar tags automáticas/inválidas
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  execute 'set local role authenticated';

  insert into public.resources (
    name, description, category_id, type, url, language,
    pricing_model, requires_credit_card, free_tier_limits, pricing_notes, tags
  )
  values (
    'Wireshark Pro Helper',
    'Ferramenta defensiva de analise de pacotes com plano gratuito.',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'tool',
    'https://pricing.example.com/tool',
    'pt-BR',
    'free',
    'no',
    'Ate 1000 consultas/mes',
    'Versao empresarial sob consulta',
    array['paid', 'open_source', 'forged_tag']::text[]
  )
  returning id, status, tags into v_new_id, v_status, v_tags;

  if v_status <> 'pending' then
    raise exception 'FAIL: status esperado pending, obtido %', v_status;
  end if;

  if v_tags <> array['free', 'no_card', 'open_source']::text[] then
    raise exception 'FAIL: trigger deveria sobrescrever tags para {free,no_card,open_source}, obtido %', v_tags;
  end if;

  -- 3. Valores inválidos bloqueados por CHECK (23514)
  begin
    insert into public.resources (name, description, category_id, type, url, language, pricing_model)
    values ('Bad Model', 'Descricao valida com mais de 10 chars', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'tool', 'https://bad1.example.com', 'en', 'invalid');
    raise exception 'FAIL: pricing_model invalido aceito';
  exception when check_violation then null; end;

  begin
    insert into public.resources (name, description, category_id, type, url, language, free_tier_limits)
    values ('Bad Limit', 'Descricao valida com mais de 10 chars', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'tool', 'https://bad2.example.com', 'en', repeat('x', 1001));
    raise exception 'FAIL: free_tier_limits > 1000 aceito';
  exception when check_violation then null; end;

  -- 4. status continua protegido contra escrita direta (42501)
  begin
    insert into public.resources (name, description, category_id, type, url, language, status)
    values ('Bypass Status', 'Descricao valida com mais de 10 chars', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'tool', 'https://bad3.example.com', 'en', 'approved');
    raise exception 'FAIL: authenticated escreveu status';
  exception when insufficient_privilege then null; end;

  execute 'reset role';
  raise notice 'PASS CATALOG PRICING PG: legado OK, trigger sobrescreveu tags=%, CHECKs e RLS/grants OK', v_tags;
end $$;
