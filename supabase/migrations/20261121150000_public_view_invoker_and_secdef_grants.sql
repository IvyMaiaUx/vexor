-- =============================================================================
-- Hardening de dois achados médios do security:scan
--
--   1. secdef_anon_execute  → public.current_user_role() era SECURITY DEFINER e
--      executável por anon. Só authenticated precisa chamá-la.
--   2. view_security_invoker_off → public.public_profiles rodava com privilégios
--      do owner (security_invoker = false) e ignorava a RLS de public.profiles.
--
-- Depois desta migration:
--   - anon perde o EXECUTE de current_user_role(); is_admin()/is_moderator()/
--     is_active_member() continuam executáveis por anon porque são os helpers
--     avaliados nas policies de tabelas públicas (chamam current_user_role()
--     internamente como owner, dentro de função SECURITY DEFINER).
--   - public_profiles roda com security_invoker = true: a RLS de profiles passa
--     a valer para visitantes e membros.
--   - a visibilidade de linha (esconder suspensos) saiu do WHERE da view e
--     virou policy, para não exigir SELECT em is_suspended de quem consulta.
--   - anon lê apenas as colunas projetadas pela view (GRANT por coluna).
--
-- Requer PostgreSQL 15+ (security_invoker em views); Supabase atende.
-- =============================================================================
begin;

-- -----------------------------------------------------------------------------
-- 1. current_user_role(): apenas authenticated executa diretamente.
-- -----------------------------------------------------------------------------
revoke execute on function public.current_user_role() from public, anon;
grant  execute on function public.current_user_role() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Helper da policy pública: suspenso não aparece para visitantes/membros.
-- -----------------------------------------------------------------------------
create or replace function public.is_public_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and not p.is_suspended
  );
$$;

revoke all on function public.is_public_profile(uuid) from public, anon, authenticated;
grant execute on function public.is_public_profile(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. anon: leitura por coluna, só o que a view projeta.
--    (authenticated mantém o GRANT de tabela da Etapa 9.1; a policy abaixo é
--    que define o que ele enxerga.)
-- -----------------------------------------------------------------------------
revoke select on public.profiles from anon;
grant select (
  id, username, display_name, avatar_url, bio, interests,
  github_url, linkedin_url, preferred_locale, created_at
) on public.profiles to anon;

-- -----------------------------------------------------------------------------
-- 4. Policy de leitura pública de perfis (aplicada pela view com invoker).
--    Permissiva: soma-se a profiles_select_own_or_mod, sem afetar escrita.
-- -----------------------------------------------------------------------------
drop policy if exists profiles_select_public_rows on public.profiles;
create policy profiles_select_public_rows on public.profiles
  for select to anon, authenticated
  using ((select public.is_public_profile(id)));

-- -----------------------------------------------------------------------------
-- 5. View com privilégios do chamador.
-- -----------------------------------------------------------------------------
create or replace view public.public_profiles
with (security_invoker = true, security_barrier = true)
as
select
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.interests,
  p.github_url,
  p.linkedin_url,
  p.preferred_locale,
  p.created_at
from public.profiles p;

revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

commit;
