-- =============================================================================
-- VEXOR — BARREIRAS DE ENTRADA NO FÓRUM
--
-- Tópicos e respostas são inseridos diretamente do navegador via PostgREST
-- (src/features/forum/forum-service.ts), portanto uma checagem apenas no
-- cliente seria trivialmente contornável. As barreiras abaixo ficam no banco
-- e valem para toda requisição autenticada de membro:
--
--   1. Idade mínima da conta (padrão: 24 horas desde profiles.created_at);
--   2. Cooldown entre publicações consecutivas (padrão: 30 segundos);
--   3. Limite diário de publicações, tópicos + respostas (padrão: 20 / 24h).
--
-- Administradores e moderadores são isentos para não travar a moderação.
-- O trigger sinaliza o bloqueio com a mensagem `forum_barrier:<motivo>` e o
-- tempo de espera em `hint`, permitindo tradução na interface.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Política única (fonte de verdade dos limites)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.forum_posting_policy()
RETURNS TABLE (
  min_account_age interval,
  cooldown        interval,
  daily_limit     integer
)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT interval '24 hours', interval '30 seconds', 20;
$$;

COMMENT ON FUNCTION public.forum_posting_policy() IS
  'Limites das barreiras de publicação do fórum. Staff (admin/moderator) é isento.';

-- -----------------------------------------------------------------------------
-- 2. Avaliação do estado de publicação do usuário
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.forum_posting_status(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  allowed               boolean,
  reason                text,
  retry_after_seconds   integer,
  posts_last_24h        integer,
  daily_limit           integer,
  min_account_age_hours integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_min_age    interval;
  v_cooldown   interval;
  v_daily      integer;
  v_role       public.user_role;
  v_created_at timestamptz;
  v_recent     integer := 0;
  v_oldest     timestamptz;
  v_last_at    timestamptz;
  v_wait       integer;
  v_min_hours  integer;
BEGIN
  SELECT p.min_account_age, p.cooldown, p.daily_limit
    INTO v_min_age, v_cooldown, v_daily
    FROM public.forum_posting_policy() p;

  v_min_hours := greatest(
    1,
    ceil(extract(epoch FROM v_min_age) / 3600.0)::integer
  );

  SELECT pr.role, pr.created_at
    INTO v_role, v_created_at
    FROM public.profiles pr
   WHERE pr.id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY
      SELECT false, 'unauthenticated'::text, 0, 0, v_daily, v_min_hours;
    RETURN;
  END IF;

  SELECT count(*)::integer, min(r.created_at), max(r.created_at)
    INTO v_recent, v_oldest, v_last_at
    FROM (
      SELECT t.created_at
        FROM public.topics t
       WHERE t.author_id = p_user_id
         AND t.created_at > now() - interval '24 hours'
      UNION ALL
      SELECT po.created_at
        FROM public.posts po
       WHERE po.author_id = p_user_id
         AND po.created_at > now() - interval '24 hours'
    ) r;

  -- Staff publica sem barreira: a moderação não pode ficar travada.
  IF v_role IN ('admin', 'moderator') THEN
    RETURN QUERY
      SELECT true, null::text, 0, v_recent, v_daily, v_min_hours;
    RETURN;
  END IF;

  IF now() - v_created_at < v_min_age THEN
    v_wait := greatest(
      1,
      ceil(extract(epoch FROM (v_created_at + v_min_age - now())))::integer
    );
    RETURN QUERY
      SELECT false, 'account_too_new'::text, v_wait, v_recent, v_daily, v_min_hours;
    RETURN;
  END IF;

  IF v_recent >= v_daily THEN
    v_wait := greatest(
      1,
      ceil(extract(epoch FROM (v_oldest + interval '24 hours' - now())))::integer
    );
    RETURN QUERY
      SELECT false, 'daily_limit'::text, v_wait, v_recent, v_daily, v_min_hours;
    RETURN;
  END IF;

  IF v_last_at IS NOT NULL AND now() - v_last_at < v_cooldown THEN
    v_wait := greatest(
      1,
      ceil(extract(epoch FROM (v_last_at + v_cooldown - now())))::integer
    );
    RETURN QUERY
      SELECT false, 'cooldown'::text, v_wait, v_recent, v_daily, v_min_hours;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT true, null::text, 0, v_recent, v_daily, v_min_hours;
END;
$$;

COMMENT ON FUNCTION public.forum_posting_status(uuid) IS
  'Estado de publicação do usuário (idade da conta, cooldown e cota diária).';

REVOKE ALL ON FUNCTION public.forum_posting_policy() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.forum_posting_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forum_posting_policy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.forum_posting_status(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. Enforcement em topics e posts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_forum_posting_barriers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status record;
BEGIN
  -- Somente requisições de usuário final são limitadas: seeds, migrations e
  -- jobs com service_role (sem JWT de sessão) continuam funcionando.
  IF auth.uid() IS NULL
     OR coalesce(
          nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
          ''
        ) = 'service_role' THEN
    RETURN new;
  END IF;

  SELECT * INTO v_status FROM public.forum_posting_status(new.author_id);

  IF v_status.allowed THEN
    RETURN new;
  END IF;

  RAISE EXCEPTION 'forum_barrier:%', v_status.reason
    USING ERRCODE = 'P0001',
          HINT    = v_status.retry_after_seconds::text;
END;
$$;

COMMENT ON FUNCTION public.enforce_forum_posting_barriers() IS
  'Bloqueia inserts de topics/posts fora da política de publicação do fórum.';

DROP TRIGGER IF EXISTS topics_forum_posting_barriers ON public.topics;
CREATE TRIGGER topics_forum_posting_barriers
  BEFORE INSERT ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.enforce_forum_posting_barriers();

DROP TRIGGER IF EXISTS posts_forum_posting_barriers ON public.posts;
CREATE TRIGGER posts_forum_posting_barriers
  BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_forum_posting_barriers();
