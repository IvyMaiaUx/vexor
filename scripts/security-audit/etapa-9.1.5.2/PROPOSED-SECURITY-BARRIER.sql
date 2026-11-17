-- =============================================================================
-- VEXOR — ETAPA 9.1.5.2: PROPOSTA ISOLADA — SECURITY BARRIER EM public_profiles
-- AVISO: SCRIPT PROPOSTO PARA REVISÃO. NÃO AUTORIZADO PARA EXECUÇÃO NESTA ETAPA.
--
-- Pré-condições:
--   1. Tabela public.profiles existente com coluna is_suspended e RLS habilitado.
--   2. Função public.is_moderator() existente (SECURITY DEFINER, search_path='').
--   3. SELECT em public.profiles revogado de anon e restrito via RLS para authenticated.
--
-- O que security_barrier = true protege:
--   Impede que o otimizador do PostgreSQL empurre predicados ou funções de baixo
--   custo fornecidos pelo chamador (ex.: funções leaky) para antes do filtro
--   `WHERE NOT p.is_suspended OR (SELECT public.is_moderator())`, evitando
--   inferência indireta de linhas suspensas via erros ou side-effects.
--
-- O que security_barrier = true NÃO protege:
--   Não substitui a projeção explícita de colunas (omitir role e is_suspended),
--   não bloqueia acesso direto à tabela base public.profiles (que depende de
--   REVOKE SELECT + RLS), e não impede inferência por contagem/existência de
--   usuários ativos que já são públicos por definição.
--
-- Impacto de desempenho e compatibilidade:
--   Impede predicate pushdown para dentro da barreira; em public.profiles com
--   índice em id/username, o impacto é baixo para consultas paginadas e mantém
--   100% de compatibilidade com security_invoker = false (owner postgres).
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'Pré-condição não atendida: public.profiles não existe';
  END IF;
END $$;

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false, security_barrier = true)
AS
SELECT
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
FROM public.profiles p
WHERE NOT p.is_suspended OR (SELECT public.is_moderator());

REVOKE ALL ON public.public_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

COMMIT;
