-- =============================================================================
-- VEXOR — MIGRATION: METADADOS ESTRUTURADOS DE CURSOS EM public.resources
-- Adiciona a coluna opcional `course_metadata jsonb` para fichas detalhadas
-- de cursos, programas, trilhas e certificações em Carreira e Aprendizado.
-- Preserva todos os recursos existentes com `course_metadata = NULL`.
-- =============================================================================

begin;

alter table public.resources
  add column if not exists course_metadata jsonb null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'resources_course_metadata_object_check'
  ) then
    alter table public.resources
      add constraint resources_course_metadata_object_check
      check (course_metadata is null or jsonb_typeof(course_metadata) = 'object');
  end if;
end $$;

comment on column public.resources.course_metadata is
  'Structured educational metadata (institution, modules, skills, tools, certification, access conditions, verification) for courses and learning paths.';

grant select (course_metadata) on public.resources to authenticated;
grant insert (course_metadata) on public.resources to authenticated;
grant update (course_metadata) on public.resources to authenticated;

commit;
