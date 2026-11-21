-- Auditoria de catálogo do Supabase (somente leitura).
-- Rode no SQL Editor ou via supabase_read_only_user e salve o resultado
-- em scripts/security-audit/last-db-audit.json para o scanner consumir.
--
-- Classificação calibrada para evitar falso positivo:
--   * funções que retornam trigger/event_trigger não podem ser chamadas
--     via RPC, então o GRANT de anon nelas é inofensivo (info);
--   * funções usadas dentro de policies PRECISAM de EXECUTE para o
--     chamador, então são helper de RLS (info);
--   * só o que sobra é candidato a revisão.

with rels as (
  select n.nspname as schema,
         c.relname as name,
         c.relkind::text as relkind,
         c.relrowsecurity,
         c.reloptions
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm')
),
pol as (
  select policyname, tablename, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public'
),
fns as (
  select p.oid,
         p.proname,
         pg_get_function_identity_arguments(p.oid) as args,
         p.prosecdef,
         p.proconfig,
         p.prorettype::regtype::text as returns,
         has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
findings as (
  -- 1. Tabela sem RLS: pior caso, tudo depende apenas do GRANT.
  select 'critical'::text as severity,
         'rls_disabled'::text as code,
         format('public.%s', r.name) as object,
         format('RLS desligado (relkind=%s); leitura/escrita dependem só do GRANT.', r.relkind) as detail
  from rels r
  where r.relkind in ('r', 'p') and not r.relrowsecurity

  union all

  -- 2. GRANT de escrita para anon.
  select 'critical',
         'anon_write_grant',
         format('public.%s', r.name),
         'anon tem INSERT/UPDATE/DELETE; qualquer visitante escreve se a policy deixar.'
  from rels r
  where r.relkind in ('r', 'p')
    and (has_table_privilege('anon', format('public.%I', r.name), 'INSERT')
      or has_table_privilege('anon', format('public.%I', r.name), 'UPDATE')
      or has_table_privilege('anon', format('public.%I', r.name), 'DELETE'))

  union all

  -- 3. Policy de escrita com WITH CHECK aberto.
  select 'medium',
         'policy_true_write',
         format('public.%s · %s (%s)', p.tablename, p.policyname, p.cmd),
         format('WITH CHECK aberto (%s).', coalesce(p.with_check, '-'))
  from pol p
  where p.cmd in ('INSERT', 'UPDATE', 'ALL')
    and btrim(coalesce(p.with_check, '')) in ('true', '(true)')

  union all

  -- 3b. Policy de DELETE/UPDATE com USING aberto.
  select 'medium',
         'policy_true_delete',
         format('public.%s · %s (%s)', p.tablename, p.policyname, p.cmd),
         format('USING aberto (%s).', coalesce(p.qual, '-'))
  from pol p
  where p.cmd in ('DELETE', 'UPDATE', 'ALL')
    and btrim(coalesce(p.qual, '')) in ('true', '(true)')

  union all

  -- 4. SECURITY DEFINER sem search_path fixo (hijacking).
  select 'high',
         'secdef_no_search_path',
         format('public.%s(%s)', f.proname, f.args),
         format('SECURITY DEFINER sem search_path fixo (proconfig=%s).', coalesce(array_to_string(f.proconfig, ','), 'null'))
  from fns f
  where f.prosecdef
    and not exists (
      select 1 from unnest(coalesce(f.proconfig, '{}'::text[])) c where c like 'search_path=%'
    )

  union all

  -- 5a. SECURITY DEFINER, mas não chamável via RPC (trigger/event trigger).
  select 'info',
         'secdef_not_callable',
         format('public.%s(%s)', f.proname, f.args),
         format('Retorna %s: o Postgres recusa chamada direta, só executa como trigger.', f.returns)
  from fns f
  where f.prosecdef and f.returns in ('trigger', 'event_trigger')

  union all

  -- 5b. SECURITY DEFINER usada dentro de policy: EXECUTE para o chamador é necessário.
  select 'info',
         'secdef_rls_helper',
         format('public.%s(%s)', f.proname, f.args),
         'Helper referenciado por policy de RLS; precisa de EXECUTE para quem avalia a policy.'
  from fns f
  where f.prosecdef
    and f.returns not in ('trigger', 'event_trigger')
    and exists (
      select 1 from pol p
      where coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') ~ ('\m' || f.proname || '\M')
    )

  union all

  -- 5c. SECURITY DEFINER chamável por anon e não classificado acima: revisar.
  select 'medium',
         'secdef_anon_execute',
         format('public.%s(%s)', f.proname, f.args),
         format('SECURITY DEFINER chamável por anon, retornando %s; roda com privilégios do owner.', f.returns)
  from fns f
  where f.prosecdef
    and f.anon_exec
    and f.returns not in ('trigger', 'event_trigger')
    and not exists (
      select 1 from pol p
      where coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') ~ ('\m' || f.proname || '\M')
    )

  union all

  -- 6. View sem security_invoker: roda como o owner, ignorando RLS das tabelas.
  select 'medium',
         'view_security_invoker_off',
         format('public.%s', r.name),
         format('View sem security_invoker=true (reloptions=%s): o WHERE roda com privilégios do owner, não do chamador.', coalesce(array_to_string(r.reloptions, ','), 'null'))
  from rels r
  where r.relkind in ('v', 'm')
    and not coalesce(array_to_string(r.reloptions, ',') like '%security_invoker=true%', false)

  union all

  -- 7. Informativo: RLS ligado e nenhuma policy = falha segura.
  select 'info',
         'rls_no_policies',
         format('public.%s', r.name),
         'RLS ligado sem policies: acesso negado por padrão (comportamento seguro).'
  from rels r
  where r.relkind in ('r', 'p')
    and r.relrowsecurity
    and not exists (select 1 from pol p where p.tablename = r.name)
)
select severity, code, object, detail
from findings
order by case severity
           when 'critical' then 1
           when 'high' then 2
           when 'medium' then 3
           when 'low' then 4
           else 5
         end,
         code,
         object;
