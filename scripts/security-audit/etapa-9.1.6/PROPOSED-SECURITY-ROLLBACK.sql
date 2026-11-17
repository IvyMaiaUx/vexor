-- =============================================================================
-- VEXOR — ETAPA 9.1.6: PROPOSTA DE ROLLBACK COMPLETO DA MIGRATION DE SEGURANÇA
-- AVISO: ARQUIVO PROPOSTO PARA REVISÃO. NÃO EXECUTAR NO BANCO PRINCIPAL NEM
--        NO SUPABASE REMOTO.
--
-- Reverte integralmente PROPOSED-SECURITY-MIGRATION.sql para o baseline
-- das migrations originais (20261110000001..20261110000003).
--
-- Nota sobre dados históricos (audit_logs_actor_id_fkey):
--   Se contas com registros em public.audit_logs tiverem sido excluídas
--   enquanto a FK esteve ausente, a FK é recriada com `NOT VALID` para
--   preservar o histórico append-only (sem apagar linhas nem violar
--   audit_logs_no_update_delete), continuando a validar novas inserções e
--   atualizações.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL OR to_regclass('public.audit_logs') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: tabelas base ausentes';
  END IF;
END $$;

-- 1. Remover trigger e função de proteção do último administrador
DROP TRIGGER IF EXISTS profiles_protect_last_admin_delete ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_last_admin_delete();

-- 2. Restaurar as 8 RPCs para suas definições originais de 20261110000002_functions_triggers.sql
CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id uuid, p_role public.user_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old public.user_role;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_user_id = auth.uid() AND p_role <> 'admin' THEN
    RAISE EXCEPTION 'admins cannot demote themselves' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_old FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.profiles SET role = p_role WHERE id = p_user_id;
  PERFORM public.write_audit_log('user.role_changed', 'profile', p_user_id,
                                 jsonb_build_object('from', v_old, 'to', p_role));
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

  UPDATE public.profiles SET is_suspended = p_suspended WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.write_audit_log(
    CASE WHEN p_suspended THEN 'user.suspended' ELSE 'user.unsuspended' END,
    'profile', p_user_id, jsonb_build_object('reason', p_reason)
  );
END;
$$;

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
  v_submitter uuid;
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

  UPDATE public.resources
  SET status           = p_decision,
      reviewed_by      = auth.uid(),
      reviewed_at      = now(),
      rejection_reason = CASE WHEN p_decision = 'rejected' THEN p_reason ELSE NULL END,
      published_at     = CASE WHEN p_decision = 'approved' THEN coalesce(published_at, now())
                              ELSE published_at END
  WHERE id = p_resource_id
  RETURNING submitted_by INTO v_submitter;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'resource not found' USING ERRCODE = 'P0002';
  END IF;

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

CREATE OR REPLACE FUNCTION public.resubmit_resource(p_resource_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_active_member() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.resources
  SET status           = 'pending',
      rejection_reason = NULL,
      reviewed_by      = NULL,
      reviewed_at      = NULL
  WHERE id = p_resource_id
    AND submitted_by = auth.uid()
    AND status = 'rejected';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'resource not found or not rejected' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_topic(p_topic_id uuid, p_action text, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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

  UPDATE public.topics
  SET status    = CASE p_action WHEN 'hide'   THEN 'hidden'::public.content_status
                                WHEN 'delete' THEN 'deleted'::public.content_status
                                WHEN 'unhide' THEN 'published'::public.content_status
                                ELSE status END,
      is_pinned = CASE p_action WHEN 'pin' THEN true WHEN 'unpin' THEN false ELSE is_pinned END,
      is_locked = CASE p_action WHEN 'lock' THEN true WHEN 'unlock' THEN false ELSE is_locked END
  WHERE id = p_topic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'topic not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.write_audit_log('topic.' || p_action, 'topic', p_topic_id,
                                 jsonb_build_object('reason', p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_post(p_post_id uuid, p_action text, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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

  UPDATE public.posts
  SET status = CASE p_action WHEN 'hide'   THEN 'hidden'::public.content_status
                             WHEN 'delete' THEN 'deleted'::public.content_status
                             ELSE 'published'::public.content_status END
  WHERE id = p_post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'post not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.write_audit_log('post.' || p_action, 'post', p_post_id,
                                 jsonb_build_object('reason', p_reason));
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
  v_is_mod       boolean := public.is_moderator();
BEGIN
  IF NOT public.is_active_member() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT author_id, status, is_locked
  INTO v_topic_author, v_topic_status, v_topic_locked
  FROM public.topics WHERE id = p_topic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'topic not found' USING ERRCODE = 'P0002';
  END IF;
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
    FROM public.posts WHERE id = p_post_id AND topic_id = p_topic_id AND status = 'published';
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
BEGIN
  IF NOT public.is_moderator() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_status = 'open' THEN
    RAISE EXCEPTION 'invalid status: %', p_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.reports
  SET status          = p_status,
      handled_by      = auth.uid(),
      handled_at      = CASE WHEN p_status IN ('resolved', 'dismissed') THEN now() ELSE NULL END,
      resolution_note = left(p_note, 1000)
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'report not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.write_audit_log('report.' || p_status::text, 'report', p_report_id,
                                 jsonb_build_object('note', p_note));
END;
$$;

-- 3. Restaurar privilégios das RPCs conforme 20261110000003_rls_and_grants.sql
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, public.user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.user_role) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_set_user_suspension(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_suspension(uuid, boolean, text) TO authenticated;
REVOKE ALL ON FUNCTION public.moderate_resource(uuid, public.resource_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_resource(uuid, public.resource_status, text) TO authenticated;
REVOKE ALL ON FUNCTION public.resubmit_resource(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resubmit_resource(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.moderate_topic(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_topic(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.moderate_post(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_post(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.set_accepted_post(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_accepted_post(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.resolve_report(uuid, public.report_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_report(uuid, public.report_status, text) TO authenticated;

-- 4. Remover view public_profiles e restaurar privilégios/policy originais de public.profiles
DROP VIEW IF EXISTS public.public_profiles;
DROP POLICY IF EXISTS profiles_select_own_or_mod ON public.profiles;
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
CREATE POLICY profiles_select_public ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);
GRANT SELECT ON public.profiles TO anon, authenticated;

-- 5. Restaurar FK original de public.audit_logs (NOT VALID para preservar órfãos históricos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.audit_logs'::regclass
       AND conname = 'audit_logs_actor_id_fkey'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES public.profiles (id) ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

COMMIT;
