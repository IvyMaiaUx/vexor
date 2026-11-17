-- =============================================================================
-- VEXOR — ETAPA 9.1.5: ROLLBACK REVERSÍVEL DAS CORREÇÕES EXPERIMENTAIS (LOCAL)
-- Restaura exatamente o estado anterior do banco local vexor_audit.
-- =============================================================================

BEGIN;

DROP TRIGGER IF EXISTS profiles_protect_last_admin_delete ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_last_admin_delete();

DROP VIEW IF EXISTS public.public_profiles;
DROP POLICY IF EXISTS profiles_select_own_or_mod ON public.profiles;
CREATE POLICY profiles_select_public ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);
GRANT SELECT ON public.profiles TO anon, authenticated;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES public.profiles (id) ON DELETE SET NULL
  NOT VALID;

COMMIT;
