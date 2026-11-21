-- =============================================================================
-- VEXOR — REGISTRO DE ACESSO DO FÓRUM (IP COM HASH + RETENÇÃO DE 6 MESES)
--
-- Motivação: investigação de abuso e resposta a requisições legais, em linha
-- com o Marco Civil da Internet (art. 15), que exige a guarda de registros de
-- acesso por 6 meses em ambiente controlado.
--
-- Privacidade (LGPD / docs/ARCHITECTURE.md):
--   * Nenhum endereço IP é armazenado em texto puro.
--   * O IP de origem (x-forwarded-for) é reduzido a SHA-256 com salt global
--     guardado em public.forum_access_log_secret (sem grants para clientes).
--   * Cada registro guarda apenas: autor, tipo/id do conteúdo e data/hora.
--   * Sem política de leitura: nem anon nem authenticated conseguem ler a
--     tabela; apenas service_role/postgres (que ignoram RLS).
--   * Purge automático com retenção padrão de 6 meses.
--
-- Nada disso é exibido na interface do painel administrativo.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 1. Salt global (linha única, inacessível a clientes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forum_access_log_secret (
  id         boolean     PRIMARY KEY DEFAULT true,
  salt       bytea       NOT NULL DEFAULT extensions.gen_random_bytes(32),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT forum_access_log_secret_singleton CHECK (id)
);

COMMENT ON TABLE public.forum_access_log_secret IS
  'Salt global do hash de IP em forum_access_log. Nunca exposto a clientes.';

INSERT INTO public.forum_access_log_secret (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.forum_access_log_secret ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.forum_access_log_secret FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Tabela de registros de acesso
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forum_access_log (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id     uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  content_type text        NOT NULL,
  content_id   uuid        NOT NULL,
  ip_hash      text,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT forum_access_log_content_type
    CHECK (content_type IN ('topic', 'post')),
  CONSTRAINT forum_access_log_ip_hash_format
    CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS forum_access_log_created_at_idx
  ON public.forum_access_log (created_at);

CREATE INDEX IF NOT EXISTS forum_access_log_actor_id_idx
  ON public.forum_access_log (actor_id, created_at DESC);

COMMENT ON TABLE public.forum_access_log IS
  'Registros de acesso a conteúdos do fórum. IP sempre em SHA-256 com salt; retenção de 6 meses.';

COMMENT ON COLUMN public.forum_access_log.ip_hash IS
  'SHA-256(x-forwarded-for || salt). Irreversível; nunca armazenar IP puro.';

ALTER TABLE public.forum_access_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.forum_access_log FROM anon, authenticated;
-- Sem policies: leitura restrita a service_role/postgres.

-- -----------------------------------------------------------------------------
-- 3. Captura automática ao criar tópico ou resposta
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.capture_forum_access_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_forwarded text;
  v_ip        text;
  v_salt      bytea;
BEGIN
  v_forwarded := coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-forwarded-for',
    ''
  );
  v_ip := btrim(split_part(v_forwarded, ',', 1));

  IF v_ip <> '' THEN
    SELECT s.salt INTO v_salt FROM public.forum_access_log_secret s WHERE s.id;
    v_ip := encode(
      extensions.digest(
        v_ip || '|' || coalesce(encode(v_salt, 'hex'), ''),
        'sha256'
      ),
      'hex'
    );
  ELSE
    v_ip := NULL;
  END IF;

  INSERT INTO public.forum_access_log (actor_id, content_type, content_id, ip_hash)
  VALUES (new.author_id, tg_argv[0], new.id, v_ip);

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.capture_forum_access_log() IS
  'Grava registro de acesso (IP em hash + timestamp) após insert em topics/posts.';

DROP TRIGGER IF EXISTS topics_capture_access_log ON public.topics;
CREATE TRIGGER topics_capture_access_log
  AFTER INSERT ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.capture_forum_access_log('topic');

DROP TRIGGER IF EXISTS posts_capture_access_log ON public.posts;
CREATE TRIGGER posts_capture_access_log
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.capture_forum_access_log('post');

-- -----------------------------------------------------------------------------
-- 4. Retenção: purge de registros com mais de 6 meses
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_forum_access_log(
  p_retention interval DEFAULT interval '6 months'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted bigint;
BEGIN
  IF p_retention < interval '1 month' THEN
    RAISE EXCEPTION 'retention must be at least 1 month' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.forum_access_log
   WHERE created_at < now() - p_retention;

  GET DIAGNOSTICS v_deleted = row_count;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.purge_forum_access_log(interval) IS
  'Remove registros de acesso do fórum além da retenção (padrão: 6 meses).';

REVOKE ALL ON FUNCTION public.purge_forum_access_log(interval)
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Agendamento diário (pg_cron quando disponível; senão, execução manual)
-- -----------------------------------------------------------------------------
DO $do$
DECLARE
  v_job bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron indisponível: agende public.purge_forum_access_log() manualmente.';
      RETURN;
    END;
  END IF;

  FOR v_job IN
    SELECT jobid FROM cron.job WHERE jobname = 'vexor-forum-access-log-purge'
  LOOP
    PERFORM cron.unschedule(v_job);
  END LOOP;

  PERFORM cron.schedule(
    'vexor-forum-access-log-purge',
    '20 4 * * *',
    'SELECT public.purge_forum_access_log()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Falha ao agendar o purge (%): execute public.purge_forum_access_log() manualmente.', sqlerrm;
END
$do$;
