-- =============================================================================
-- VEXOR — ETAPA 9.1.6: PROPOSTA CONSOLIDADA DE MIGRATION DE SEGURANÇA
-- AVISO: ARQUIVO PROPOSTO PARA REVISÃO. NÃO COLOCAR EM supabase/migrations/.
--        NÃO EXECUTAR NO BANCO PRINCIPAL (vexor_audit) NEM NO SUPABASE REMOTO.
--
-- Consolida as correções aprovadas:
--   - V1: Proteção do último administrador ativo (RPCs + trigger BEFORE DELETE)
--   - V2: Privacidade de public.profiles + view public.public_profiles
--         (security_invoker = false, security_barrier = true, sem role/is_suspended)
--   - V3/V4: Revalidação pós-lock em todas as RPCs administrativas e de moderação
--   - V5 (Alternativa C aprovada): Remoção da FK audit_logs_actor_id_fkey,
--         preservando actor_id histórico imutável e tabela 100% append-only
--   - Revalidação pós-lock em resubmit_resource e set_accepted_post
--
-- Chave de advisory lock de governança administrativa:
--   0x5645584F5241444D = 6216471958360507469
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Verificação de precondições
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL
     OR to_regclass('public.audit_logs') IS NULL
     OR to_regclass('public.resources') IS NULL
     OR to_regclass('public.topics') IS NULL
     OR to_regclass('public.posts') IS NULL
     OR to_regclass('public.reports') IS NULL
     OR to_regclass('public.notifications') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: tabelas base obrigatórias ausentes em public';
  END IF;

  IF to_regprocedure('public.is_admin()') IS NULL
     OR to_regprocedure('public.is_moderator()') IS NULL
     OR to_regprocedure('public.is_active_member()') IS NULL
     OR to_regprocedure('public.write_audit_log(text,text,uuid,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: funções auxiliares de segurança ausentes em public';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. V1 & V3: Proteção do último administrador + advisory lock + revalidação
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_user_id uuid,
  p_role    public.user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_susp boolean;
  v_old         public.user_role;
  v_target_susp boolean;
  v_other_admin bigint;
BEGIN
  -- Fail-fast pré-lock
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_user_id = auth.uid() AND p_role <> 'admin' THEN
    RAISE EXCEPTION 'admins cannot demote themselves' USING ERRCODE = '42501';
  END IF;

  -- Serializa operações administrativas críticas de governança
  PERFORM pg_advisory_xact_lock(6216471958360507469);

  -- Revalidação pós-lock da autorização do chamador + lock compartilhado
  SELECT p.role, p.is_suspended
    INTO v_caller_role, v_caller_susp
    FROM public.profiles p
   WHERE p.id = auth.uid()
     FOR SHARE NOWAIT;

  IF NOT FOUND OR v_caller_susp OR v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Lock exclusivo sobre o perfil alvo
  SELECT p.role, p.is_suspended
    INTO v_old, v_target_susp
    FROM public.profiles p
   WHERE p.id = p_user_id
     FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;

  -- Impede rebaixamento do último administrador ativo
  IF v_old = 'admin' AND NOT v_target_susp AND p_role <> 'admin' THEN
    SELECT count(*)
      INTO v_other_admin
      FROM public.profiles p
     WHERE p.role = 'admin'
       AND NOT p.is_suspended
       AND p.id <> p_user_id;

    IF v_other_admin = 0 THEN
      RAISE EXCEPTION 'cannot demote the last active admin' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.profiles SET role = p_role WHERE id = p_user_id;
  PERFORM public.write_audit_log(
    'user.role_changed',
    'profile',
    p_user_id,
    jsonb_build_object('from', v_old, 'to', p_role)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_suspension(
  p_user_id   uuid,
  p_suspended boolean,
  p_reason    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role   public.user_role;
  v_caller_susp   boolean;
  v_target_role   public.user_role;
  v_was_suspended boolean;
  v_other_admin   bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'admins cannot suspend themselves' USING ERRCODE = '42501';
  END IF;
  IF p_suspended AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
    RAISE EXCEPTION 'a reason is required to suspend a user' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(6216471958360507469);

  SELECT p.role, p.is_suspended
    INTO v_caller_role, v_caller_susp
    FROM public.profiles p
   WHERE p.id = auth.uid()
     FOR SHARE NOWAIT;

  IF NOT FOUND OR v_caller_susp OR v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT p.role, p.is_suspended
    INTO v_target_role, v_was_suspended
    FROM public.profiles p
   WHERE p.id = p_user_id
     FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_suspended AND v_target_role = 'admin' AND NOT v_was_suspended THEN
    SELECT count(*)
      INTO v_other_admin
      FROM public.profiles p
     WHERE p.role = 'admin'
       AND NOT p.is_suspended
       AND p.id <> p_user_id;

    IF v_other_admin = 0 THEN
      RAISE EXCEPTION 'cannot suspend the last active admin' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.profiles SET is_suspended = p_suspended WHERE id = p_user_id;
  PERFORM public.write_audit_log(
    CASE WHEN p_suspended THEN 'user.suspended' ELSE 'user.unsuspended' END,
    'profile',
    p_user_id,
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

-- Trigger BEFORE DELETE para bloquear exclusão direta ou via ON DELETE CASCADE (auth.users)
CREATE OR REPLACE FUNCTION public.protect_last_admin_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_other_admin bigint;
BEGIN
  IF OLD.role = 'admin' AND NOT OLD.is_suspended THEN
    PERFORM pg_advisory_xact_lock(6216471958360507469);

    SELECT count(*)
      INTO v_other_admin
      FROM public.profiles p
     WHERE p.role = 'admin'
       AND NOT p.is_suspended
       AND p.id <> OLD.id;

    IF v_other_admin = 0 THEN
      RAISE EXCEPTION 'cannot delete the last active admin' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_last_admin_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_protect_last_admin_delete ON public.profiles;
CREATE TRIGGER profiles_protect_last_admin_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_last_admin_delete();

-- -----------------------------------------------------------------------------
-- 2. V4: Revalidação pós-lock nas RPCs de moderação
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderate_resource(
  p_resource_id uuid,
  p_decision    public.resource_status,
  p_reason      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_submitter   uuid;
  v_caller_role public.user_role;
  v_caller_susp boolean;
BEGIN
  IF NOT public.is_moderator() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected', 'archived') THEN
    RAISE EXCEPTION 'invalid decision: %', p_decision USING ERRCODE = '22023';
  END IF;
  IF p_decision = 'rejected' AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
    RAISE EXCEPTION 'a reason is required to reject a resource' USING ERRCODE = '22023';
  END IF;

  SELECT r.submitted_by INTO v_submitter
    FROM public.resources r
   WHERE r.id = p_resource_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'resource not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT p.role, p.is_suspended INTO v_caller_role, v_caller_susp
    FROM public.profiles p
   WHERE p.id = auth.uid()
     FOR SHARE NOWAIT;

  IF NOT FOUND OR v_caller_susp OR v_caller_role NOT IN ('moderator', 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.resources r
     SET status           = p_decision,
         reviewed_by      = auth.uid(),
         reviewed_at      = now(),
         rejection_reason = CASE WHEN p_decision = 'rejected' THEN p_reason ELSE NULL END,
         published_at     = CASE WHEN p_decision = 'approved' THEN coalesce(r.published_at, now())
                                 ELSE r.published_at END
   WHERE r.id = p_resource_id;

  PERFORM public.write_audit_log('resource.' || p_decision::text, 'resource', p_resource_id,
                                 jsonb_build_object('reason', p_reason));

  IF p_decision IN ('approved', 'rejected')
     AND v_submitter IS NOT NULL AND v_submitter <> auth.uid() THEN
    INSERT INTO public.notifications (user_id, type, actor_id, resource_id)
    VALUES (v_submitter,
            CASE WHEN p_decision = 'approved' THEN 'resource_approved'::public.notification_type
                 ELSE 'resource_rejected'::public.notification_type END,
            auth.uid(), p_resource_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_topic(
  p_topic_id uuid,
  p_action   text,
  p_reason   text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_susp boolean;
BEGIN
  IF NOT public.is_moderator() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('hide', 'unhide', 'delete', 'pin', 'unpin', 'lock', 'unlock') THEN
    RAISE EXCEPTION 'invalid action: %', p_action USING ERRCODE = '22023';
  END IF;
  IF p_action IN ('hide', 'delete') AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
    RAISE EXCEPTION 'a reason is required' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.topics WHERE id = p_topic_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'topic not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT p.role, p.is_suspended INTO v_caller_role, v_caller_susp
    FROM public.profiles p
   WHERE p.id = auth.uid()
     FOR SHARE NOWAIT;

  IF NOT FOUND OR v_caller_susp OR v_caller_role NOT IN ('moderator', 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.topics
     SET status    = CASE p_action WHEN 'hide'   THEN 'hidden'::public.content_status
                                   WHEN 'delete' THEN 'deleted'::public.content_status
                                   WHEN 'unhide' THEN 'published'::public.content_status
                                   ELSE status END,
         is_pinned = CASE p_action WHEN 'pin' THEN true WHEN 'unpin' THEN false ELSE is_pinned END,
         is_locked = CASE p_action WHEN 'lock' THEN true WHEN 'unlock' THEN false ELSE is_locked END
   WHERE id = p_topic_id;

  PERFORM public.write_audit_log('topic.' || p_action, 'topic', p_topic_id,
                                 jsonb_build_object('reason', p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_post(
  p_post_id uuid,
  p_action  text,
  p_reason  text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_susp boolean;
BEGIN
  IF NOT public.is_moderator() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('hide', 'unhide', 'delete') THEN
    RAISE EXCEPTION 'invalid action: %', p_action USING ERRCODE = '22023';
  END IF;
  IF p_action IN ('hide', 'delete') AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
    RAISE EXCEPTION 'a reason is required' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.posts WHERE id = p_post_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'post not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT p.role, p.is_suspended INTO v_caller_role, v_caller_susp
    FROM public.profiles p
   WHERE p.id = auth.uid()
     FOR SHARE NOWAIT;

  IF NOT FOUND OR v_caller_susp OR v_caller_role NOT IN ('moderator', 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.posts
     SET status = CASE p_action WHEN 'hide'   THEN 'hidden'::public.content_status
                                WHEN 'delete' THEN 'deleted'::public.content_status
                                ELSE 'published'::public.content_status END
   WHERE id = p_post_id;

  PERFORM public.write_audit_log('post.' || p_action, 'post', p_post_id,
                                 jsonb_build_object('reason', p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_report(
  p_report_id uuid,
  p_status    public.report_status,
  p_note      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_role public.user_role;
  v_caller_susp boolean;
BEGIN
  IF NOT public.is_moderator() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_status = 'open' THEN
    RAISE EXCEPTION 'invalid status: %', p_status USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'report not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT p.role, p.is_suspended INTO v_caller_role, v_caller_susp
    FROM public.profiles p
   WHERE p.id = auth.uid()
     FOR SHARE NOWAIT;

  IF NOT FOUND OR v_caller_susp OR v_caller_role NOT IN ('moderator', 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.reports
     SET status          = p_status,
         handled_by      = auth.uid(),
         handled_at      = CASE WHEN p_status IN ('resolved', 'dismissed') THEN now() ELSE NULL END,
         resolution_note = left(p_note, 1000)
   WHERE id = p_report_id;

  PERFORM public.write_audit_log('report.' || p_status::text, 'report', p_report_id,
                                 jsonb_build_object('note', p_note));
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. Revalidação pós-lock em resubmit_resource e set_accepted_post
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resubmit_resource(p_resource_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_submitted_by uuid;
  v_status       public.resource_status;
  v_caller_susp  boolean;
BEGIN
  IF NOT public.is_active_member() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT r.submitted_by, r.status
    INTO v_submitted_by, v_status
    FROM public.resources r
   WHERE r.id = p_resource_id
     FOR UPDATE;

  IF NOT FOUND OR v_submitted_by IS DISTINCT FROM auth.uid() OR v_status <> 'rejected' THEN
    RAISE EXCEPTION 'resource not found or not rejected' USING ERRCODE = 'P0002';
  END IF;

  SELECT p.is_suspended
    INTO v_caller_susp
    FROM public.profiles p
   WHERE p.id = auth.uid()
     FOR SHARE NOWAIT;

  IF NOT FOUND OR v_caller_susp THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.resources
     SET status           = 'pending',
         rejection_reason = NULL,
         reviewed_by      = NULL,
         reviewed_at      = NULL
   WHERE id = p_resource_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_accepted_post(p_topic_id uuid, p_post_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_topic_author uuid;
  v_topic_status public.content_status;
  v_topic_locked boolean;
  v_post_author  uuid;
  v_caller_role  public.user_role;
  v_caller_susp  boolean;
  v_is_mod       boolean;
BEGIN
  IF NOT public.is_active_member() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT author_id, status, is_locked
    INTO v_topic_author, v_topic_status, v_topic_locked
    FROM public.topics
   WHERE id = p_topic_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'topic not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT p.role, p.is_suspended
    INTO v_caller_role, v_caller_susp
    FROM public.profiles p
   WHERE p.id = auth.uid()
     FOR SHARE NOWAIT;

  IF NOT FOUND OR v_caller_susp THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_is_mod := v_caller_role IN ('moderator', 'admin');

  IF v_topic_status <> 'published' THEN
    RAISE EXCEPTION 'topic is not published' USING ERRCODE = '22023';
  END IF;
  IF NOT (v_is_mod OR v_topic_author = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_topic_locked AND NOT v_is_mod THEN
    RAISE EXCEPTION 'topic is locked' USING ERRCODE = '22023';
  END IF;

  IF p_post_id IS NOT NULL THEN
    SELECT author_id INTO v_post_author
      FROM public.posts
     WHERE id = p_post_id AND topic_id = p_topic_id AND status = 'published';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'post does not belong to this topic or is not published' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.topics SET accepted_post_id = p_post_id WHERE id = p_topic_id;

  IF p_post_id IS NOT NULL AND v_post_author IS NOT NULL AND v_post_author <> auth.uid() THEN
    INSERT INTO public.notifications (user_id, type, actor_id, topic_id, post_id)
    VALUES (v_post_author, 'solution_accepted', auth.uid(), p_topic_id, p_post_id);
  END IF;

  IF v_is_mod AND v_topic_author IS DISTINCT FROM auth.uid() THEN
    PERFORM public.write_audit_log('topic.accepted_post_changed', 'topic', p_topic_id,
                                   jsonb_build_object('post_id', p_post_id));
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Grants explícitos nas RPCs alteradas
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, public.user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.user_role) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_user_suspension(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_suspension(uuid, boolean, text) TO authenticated;

REVOKE ALL ON FUNCTION public.moderate_resource(uuid, public.resource_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_resource(uuid, public.resource_status, text) TO authenticated;

REVOKE ALL ON FUNCTION public.moderate_topic(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_topic(uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.moderate_post(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_post(uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.resolve_report(uuid, public.report_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_report(uuid, public.report_status, text) TO authenticated;

REVOKE ALL ON FUNCTION public.resubmit_resource(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resubmit_resource(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.set_accepted_post(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_accepted_post(uuid, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. V2: Privacidade de public.profiles + View public.public_profiles
--    (security_invoker = false + security_barrier = true; omite role e is_suspended)
-- -----------------------------------------------------------------------------
REVOKE SELECT ON public.profiles FROM anon;

DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own_or_mod ON public.profiles;
CREATE POLICY profiles_select_own_or_mod ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_moderator()));

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

-- -----------------------------------------------------------------------------
-- 6. V5 (Alternativa C aprovada): audit_logs.actor_id sem FK, 100% append-only
--    Escolha deliberada para preservar UUID histórico após exclusão de contas.
--    Consultas que exibem perfil do ator devem utilizar LEFT JOIN.
-- -----------------------------------------------------------------------------
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;

COMMIT;
