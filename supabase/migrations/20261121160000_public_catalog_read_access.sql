-- =============================================================================
-- Catálogo público somente leitura (SEO)
--
-- O diretório /catalog e as páginas /catalog/<slug> deixaram de ser rotas
-- privadas no proxy para que visitantes anônimos e crawlers possam lê-las.
-- Esta migration abre apenas o necessário para isso:
--
--   - anon recebe SELECT por coluna em public.resources, limitado às colunas
--     que o catálogo público já exibe. Ficam de fora reviewed_by, reviewed_at,
--     rejection_reason e search_vector.
--   - a linha visível para anon é definida pela policy
--     `resources_select_approved_public`: somente status = 'approved'.
--   - anon recebe SELECT em public.categories (a policy `categories_select`
--     já existente libera só is_active).
--
-- Nada de INSERT/UPDATE/DELETE é concedido: submissão, moderação, bookmarks e
-- as demais áreas privadas continuam exigindo sessão autenticada.
-- =============================================================================
begin;

-- -----------------------------------------------------------------------------
-- 1. Categorias: leitura pública (policy já restringe a is_active).
-- -----------------------------------------------------------------------------
grant select on public.categories to anon;

-- -----------------------------------------------------------------------------
-- 2. Recursos: leitura pública por coluna + policy de linha.
--    status entra no GRANT porque é referenciado pelo USING da policy.
-- -----------------------------------------------------------------------------
grant select (
  id, slug, name, description, description_pt, description_en, category_id,
  type, url, language, difficulty, author_name, submitted_by, status,
  published_at, created_at, updated_at, pricing_model, requires_credit_card,
  free_tier_limits, pricing_notes, tags, course_metadata
) on public.resources to anon;

create policy resources_select_approved_public
  on public.resources
  for select
  to anon
  using (status = 'approved');

commit;
