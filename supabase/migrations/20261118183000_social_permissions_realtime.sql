-- =============================================================================
-- VEXOR — ETAPA 10.3.6.1: CORREÇÃO INCREMENTAL DE PERMISSÕES E REALTIME
-- Corrige achados POST-01 e POST-02 da Etapa 10.3.5:
--   POST-01: Concede GRANT INSERT nas colunas sociais (kind, shared_url, resource_id)
--            de public.topics para authenticated, mantendo bloqueio das colunas administrativas.
--   POST-02: Adiciona public.direct_messages e public.notifications à publicação
--            supabase_realtime de forma idempotente, sem alterar RLS nem outras publicações.
-- =============================================================================

begin;

-- 1. POST-01: GRANT INSERT apenas nas novas colunas sociais de public.topics
--    Preserva os grants existentes de (category_id, title, body) e mantém
--    id, author_id, status, created_at, updated_at, vote_count, is_pinned, is_locked,
--    accepted_post_id e search_vector inacessíveis para escrita direta por authenticated.
grant insert (kind, shared_url, resource_id) on public.topics to authenticated;

-- 2. POST-02: Habilitação idempotente de direct_messages e notifications em supabase_realtime
do $$
begin
  if exists (
    select 1
      from pg_catalog.pg_publication
     where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
        from pg_catalog.pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'direct_messages'
    ) then
      execute 'alter publication supabase_realtime add table public.direct_messages';
    end if;

    if not exists (
      select 1
        from pg_catalog.pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
    ) then
      execute 'alter publication supabase_realtime add table public.notifications';
    end if;
  end if;
end $$;

commit;
