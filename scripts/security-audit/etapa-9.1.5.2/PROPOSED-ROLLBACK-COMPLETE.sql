-- =============================================================================
-- VEXOR — ETAPA 9.1.5.2: PROPOSTA DE ROLLBACK COMPLETO E AUTOSSUFICIENTE
-- AVISO: SCRIPT PROPOSTO PARA REVISÃO. NÃO AUTORIZADO PARA EXECUÇÃO NESTA ETAPA.
--
-- Pré-condições:
--   1. Banco local vexor_audit com schema da Etapa 9.1.5 aplicado.
--   2. Para restauração integral de dados pré-9.1.5 (caso contas com logs
--      tenham sido excluídas), utilizar backup-vexor_audit-pre-9.1.5.sql.
--
-- Dependência explícita da FK audit_logs_actor_id_fkey:
--   Se registros em public.audit_logs possuírem actor_id de perfis já excluídos
--   durante a vigência de V5 (ex.: 21 linhas no banco local), a FK é recriada
--   com `NOT VALID` para não remover dados históricos nem falhar na restauração.
--   Caso contrário (0 órfãos), ela pode ser validada sem erro.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL OR to_regclass('public.audit_logs') IS NULL THEN
    RAISE EXCEPTION 'Pré-condição não atendida: tabelas base ausentes';
  END IF;
END $$;

-- 1. Remover trigger e função de proteção adicionados na Etapa 9.1.5
DROP TRIGGER IF EXISTS profiles_protect_last_admin_delete ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_last_admin_delete();

-- 2. Restaurar as 6 RPCs originais exatamente como em 20261110000002_functions_triggers.sql
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
    'profile', p_user_id, jsonb_build_object('reason', p_reason));
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

  UPDATE public.resources r
  SET status           = p_decision,
      reviewed_by      = auth.uid(),
      reviewed_at      = now(),
      rejection_reason = CASE WHEN p_decision = 'rejected' THEN p_reason ELSE NULL END,
      published_at     = CASE WHEN p_decision = 'approved' THEN coalesce(r.published_at, now())
                              ELSE r.published_at END
  WHERE r.id = p_resource_id
  RETURNING r.submitted_by INTO v_submitter;

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

-- 3. Restaurar privilégios e policies originais de public.profiles (e remover view experimental)
DROP VIEW IF EXISTS public.public_profiles;
DROP POLICY IF EXISTS profiles_select_own_or_mod ON public.profiles;
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
CREATE POLICY profiles_select_public ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);
GRANT SELECT ON public.profiles TO anon, authenticated;

-- 4. Restaurar FK original em public.audit_logs (preservando dados históricos)
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
