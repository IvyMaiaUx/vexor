-- =============================================================================
-- VEXOR — ETAPA 9.1.5.2: PROPOSTA ISOLADA — REVALIDAÇÃO EM resubmit_resource E set_accepted_post
-- AVISO: SCRIPT PROPOSTO PARA REVISÃO. NÃO AUTORIZADO PARA EXECUÇÃO NESTA ETAPA.
--
-- Pré-condições:
--   1. Tabelas public.resources, public.topics, public.posts, public.profiles existentes.
--   2. Helpers public.is_active_member() e public.is_moderator() existentes.
--
-- Análise individual:
--   1. resubmit_resource(p_resource_id):
--      - Modelo de autorização: exclusivo do autor (submitted_by = auth.uid())
--        que seja membro ativo (NOT is_suspended). NÃO exige is_moderator().
--      - Risco sem revalidação: se o autor for suspenso concorrentemente enquanto
--        a RPC aguarda lock na linha de public.resources, o is_active_member()
--        inicial fica obsoleto.
--      - Correção justificada: travar public.resources FOR UPDATE primeiro e
--        revalidar public.profiles (NOT is_suspended) com FOR SHARE NOWAIT.
--
--   2. set_accepted_post(p_topic_id, p_post_id):
--      - Modelo de autorização: autor do tópico (quando desbloqueado) OU
--        moderador/admin ativo.
--      - Bug/risco identificado no código original: `v_is_mod := public.is_moderator()`
--        é avaliado no bloco DECLARE *antes* de `FOR UPDATE` em public.topics!
--        Se um moderador for rebaixado ou suspenso enquanto aguarda o lock do
--        tópico, `v_is_mod` permanece TRUE em memória.
--      - Correção justificada: travar public.topics FOR UPDATE, revalidar
--        public.profiles com FOR SHARE NOWAIT para obter `v_caller_role` e
--        `v_caller_susp` atualizados, e só então calcular `v_is_mod`.
-- =============================================================================

BEGIN;

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

COMMIT;
