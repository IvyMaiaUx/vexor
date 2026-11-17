-- =============================================================================
-- VEXOR — ETAPA 9.1.3.4: AUDITORIA E TESTE DA VIEW public.public_profiles
-- Arquivo: scripts/security-audit/02-profile-privacy-tests.sql
-- =============================================================================

-- =============================================================================
-- 1. ESPECIFICAÇÃO DA VIEW SEGURA
-- =============================================================================
-- Propriedades:
-- - Proprietário: postgres
-- - Modo: WITH (security_invoker = false)
-- - Colunas expostas (10 públicas + role mascarado):
--   id, username, display_name, avatar_url, bio, interests, github_url,
--   linkedin_url, preferred_locale, created_at, role.
-- - Coluna sensível 'is_suspended' NUNCA é projetada no SELECT da view.
-- - Filtro de visibilidade: Usuários suspensos só aparecem para moderadores e admins.

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false)
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
  p.created_at,
  p.role
FROM public.profiles p
WHERE (NOT p.is_suspended) OR (SELECT public.is_moderator());

ALTER VIEW public.public_profiles OWNER TO postgres;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- =============================================================================
-- 2. TESTE DE ISOLAMENTO DE PRIVACIDADE: ACESSO ANÔNIMO
-- =============================================================================
-- Cenário: Visitante não autenticado (anon) consulta a view pública.
-- Usuário Ativo ('alice'): deve ser retornado.
-- Usuário Suspenso ('bob_spammer'): NÃO deve ser retornado.
-- Nenhuma coluna 'is_suspended' deve constar no result set.

-- EXECUÇÃO COMO 'anon':
-- SET LOCAL ROLE anon;
-- SET LOCAL "request.jwt.claim.sub" TO '';
-- SELECT username, role FROM public.public_profiles;
-- RESULTADO ESPERADO:
-- Retorna 'alice' (role: 'member').
-- 'bob_spammer' é ocultado pela cláusula WHERE.

-- =============================================================================
-- 3. TESTE DE AUDITORIA DE MODERAÇÃO: ACESSO DE MODERADOR/ADMIN
-- =============================================================================
-- Cenário: Moderador autenticado consulta a view pública.
-- Moderador precisa auditar perfis, logo perfis suspensos devem aparecer.

-- EXECUÇÃO COMO 'moderator':
-- SET LOCAL ROLE authenticated;
-- SET LOCAL "request.jwt.claim.sub" TO 'uuid-do-moderador';
-- SELECT username, role FROM public.public_profiles;
-- RESULTADO ESPERADO:
-- Retorna 'alice' e 'bob_spammer', permitindo moderação contínua.

-- =============================================================================
-- 4. ANÁLISE COMPARATIVA: POR QUE security_invoker = false É OBRIGATÓRIO?
-- =============================================================================
-- Se a view fosse declarada com WITH (security_invoker = true):
-- 1. O PostgreSQL avaliaria as permissões e RLS da tabela base 'public.profiles'
--    utilizando o papel do chamador final (anon / authenticated).
-- 2. Para proteger a coluna sensível 'is_suspended' na tabela base, o privilégio
--    SELECT dessa coluna seria revogado de 'anon'.
-- 3. Consequência: Como a cláusula WHERE da view precisa avaliar
--    'NOT p.is_suspended', o chamador anônimo receberia imediatamente:
--    ERROR: 42501 permission denied for table profiles.
-- 4. Ao utilizar security_invoker = false (comportamento padrão e seguro), a view
--    executa como 'postgres', que possui permissão de leitura sobre a coluna base
--    para aplicar o filtro, entregando ao chamador apenas as 10 colunas públicas.
