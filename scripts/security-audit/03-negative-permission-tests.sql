-- =============================================================================
-- VEXOR — ETAPA 9.1.3.4: AUDITORIA DE GRANTS, RLS E TESTES NEGATIVOS
-- Arquivo: scripts/security-audit/03-negative-permission-tests.sql
-- =============================================================================

-- =============================================================================
-- 1. QUERIES DE AUDITORIA DE CATÁLOGO (METADATA INSPECTION)
-- =============================================================================

-- 1.1 Listar todas as Políticas RLS ativas no schema public:
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 1.2 Auditar Grants em Tabelas e Views:
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;

-- 1.3 Auditar Grants a Nível de Coluna (especialmente em public.profiles):
SELECT
  grantee,
  table_schema,
  table_name,
  column_name,
  privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, column_name, privilege_type;

-- 1.4 Auditar Privilégios de Execução em Rotinas / RPCs:
SELECT
  routine_schema,
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
ORDER BY routine_name, grantee;

-- =============================================================================
-- 2. MATRIZ DE TESTES NEGATIVOS DE SEGURANÇA
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TESTE NEGATIVO E1: Anônimo tentando invocar RPCs administrativas
-- -----------------------------------------------------------------------------
-- SET LOCAL ROLE anon;
-- SELECT public.admin_set_user_role('00000000-0000-0000-0000-000000000001', 'admin');
-- RESULTADO ESPERADO:
-- ERROR: 42501 permission denied for function admin_set_user_role
-- (Garantido pelo comando REVOKE ALL ON FUNCTION ... FROM public, anon)

-- -----------------------------------------------------------------------------
-- TESTE NEGATIVO E2: Membro autenticado comum tentando executar RPC administrativa
-- -----------------------------------------------------------------------------
-- SET LOCAL ROLE authenticated;
-- SET LOCAL "request.jwt.claim.sub" TO 'uuid-de-membro-comum';
-- SELECT public.admin_set_user_role('00000000-0000-0000-0000-000000000002', 'admin');
-- RESULTADO ESPERADO:
-- ERROR: 42501 forbidden
-- (Garantido pela verificação interna IF NOT public.is_admin() THEN RAISE EXCEPTION)

-- -----------------------------------------------------------------------------
-- TESTE NEGATIVO E3: Tentativa de injeção direta em public.write_audit_log
-- -----------------------------------------------------------------------------
-- SET LOCAL ROLE authenticated;
-- SET LOCAL "request.jwt.claim.sub" TO 'uuid-de-membro-comum';
-- SELECT public.write_audit_log('fake_action', 'profile', auth.uid(), '{}'::jsonb);
-- RESULTADO ESPERADO:
-- ERROR: 42501 permission denied for function write_audit_log
-- (Garantido pelo REVOKE explícito de anon e authenticated)

-- -----------------------------------------------------------------------------
-- TESTE NEGATIVO E4: Membro comum tentando escalar privilégio via UPDATE colunar
-- -----------------------------------------------------------------------------
-- SET LOCAL ROLE authenticated;
-- SET LOCAL "request.jwt.claim.sub" TO 'uuid-do-proprio-membro';
-- UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
-- RESULTADO ESPERADO:
-- ERROR: 42501 permission denied for column "role" of relation "profiles"
-- (Garantido pela ausência de 'role' no GRANT UPDATE colunar de public.profiles)

-- -----------------------------------------------------------------------------
-- TESTE NEGATIVO E5: Tentativa de mutação ou deleção na tabela de auditoria
-- -----------------------------------------------------------------------------
-- DELETE FROM public.audit_logs WHERE id = 1;
-- UPDATE public.audit_logs SET action = 'tampered' WHERE id = 1;
-- RESULTADO ESPERADO:
-- ERROR: 42501 audit_logs is append-only
-- (Garantido pelo trigger BEFORE UPDATE OR DELETE: audit_logs_block_mutation)
