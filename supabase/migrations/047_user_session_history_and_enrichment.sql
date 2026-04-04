-- Session list enrichment (IP / UA from your app) + sign-in history.
-- Replaces public.get_user_active_sessions / revoke_* if present so the API and Security page stay in sync.
-- Lists rows from auth.sessions for auth.uid(); marks current session using p_current_session_id from the API (JWT session_id claim).

CREATE TABLE IF NOT EXISTS public.user_session_client_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  user_agent text,
  ip_address text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id)
);

CREATE INDEX IF NOT EXISTS user_session_client_info_user_id_idx
  ON public.user_session_client_info (user_id);

CREATE TABLE IF NOT EXISTS public.user_session_sign_in_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  user_agent text,
  ip_address text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'revoked'))
);

CREATE INDEX IF NOT EXISTS user_session_sign_in_history_user_started_idx
  ON public.user_session_sign_in_history (user_id, started_at DESC);

ALTER TABLE public.user_session_client_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_session_sign_in_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own session client info" ON public.user_session_client_info;
CREATE POLICY "Users read own session client info"
  ON public.user_session_client_info FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own session sign-in history" ON public.user_session_sign_in_history;
CREATE POLICY "Users read own session sign-in history"
  ON public.user_session_sign_in_history FOR SELECT
  USING (auth.uid() = user_id);

-- Upsert client-visible fields and open a history row once per auth session id.
CREATE OR REPLACE FUNCTION public.record_user_session_touch(
  p_session_id uuid,
  p_user_agent text,
  p_ip_address text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF p_session_id IS NULL OR auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.sessions s
    WHERE s.id = p_session_id AND s.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.user_session_client_info (user_id, session_id, user_agent, ip_address, updated_at)
  VALUES (auth.uid(), p_session_id, p_user_agent, p_ip_address, now())
  ON CONFLICT (user_id, session_id) DO UPDATE SET
    user_agent = COALESCE(EXCLUDED.user_agent, user_session_client_info.user_agent),
    ip_address = COALESCE(EXCLUDED.ip_address, user_session_client_info.ip_address),
    updated_at = now();

  IF NOT EXISTS (
    SELECT 1 FROM public.user_session_sign_in_history h
    WHERE h.user_id = auth.uid()
      AND h.session_id = p_session_id
      AND h.ended_at IS NULL
  ) THEN
    INSERT INTO public.user_session_sign_in_history (
      user_id, session_id, user_agent, ip_address, started_at, status
    )
    VALUES (auth.uid(), p_session_id, p_user_agent, p_ip_address, now(), 'active');
  END IF;
END;
$$;

-- Drop old overloads (e.g. zero-arg or renamed-parameter uuid overload) so one canonical function remains.
DROP FUNCTION IF EXISTS public.get_user_active_sessions();
DROP FUNCTION IF EXISTS public.get_user_active_sessions(uuid);

CREATE OR REPLACE FUNCTION public.get_user_active_sessions(p_current_session_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  user_agent text,
  updated_at timestamptz,
  ip_address text,
  is_current boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    s.id,
    COALESCE(NULLIF(TRIM(s.user_agent), ''), e.user_agent, 'Unknown') AS user_agent,
    GREATEST(s.updated_at, COALESCE(e.updated_at, s.updated_at)) AS updated_at,
    COALESCE(NULLIF(TRIM(e.ip_address), ''), 'Unknown') AS ip_address,
    (
      s.id = p_current_session_id
      OR (
        p_current_session_id IS NULL
        AND (auth.jwt() ->> 'session_id') IS NOT NULL
        AND s.id::text = (auth.jwt() ->> 'session_id')
      )
    ) AS is_current
  FROM auth.sessions s
  LEFT JOIN public.user_session_client_info e
    ON e.session_id = s.id AND e.user_id = s.user_id
  WHERE s.user_id = auth.uid()
  ORDER BY GREATEST(s.updated_at, COALESCE(e.updated_at, s.updated_at)) DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_user_session_history(p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  user_agent text,
  ip_address text,
  started_at timestamptz,
  ended_at timestamptz,
  status text,
  is_active_session boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    h.id,
    h.session_id,
    COALESCE(NULLIF(TRIM(h.user_agent), ''), 'Unknown') AS user_agent,
    COALESCE(NULLIF(TRIM(h.ip_address), ''), 'Unknown') AS ip_address,
    h.started_at,
    h.ended_at,
    h.status,
    EXISTS (
      SELECT 1 FROM auth.sessions s
      WHERE s.id = h.session_id AND s.user_id = auth.uid()
    ) AS is_active_session
  FROM public.user_session_sign_in_history h
  WHERE h.user_id = auth.uid()
  ORDER BY h.started_at DESC
  LIMIT LEAST(COALESCE(p_limit, 50), 100);
$$;

-- Cannot rename parameters with CREATE OR REPLACE; drop first if an older revoke_user_session(uuid) exists.
DROP FUNCTION IF EXISTS public.revoke_user_session(uuid);

CREATE OR REPLACE FUNCTION public.revoke_user_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.sessions s
    WHERE s.id = p_session_id AND s.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  DELETE FROM auth.sessions s WHERE s.id = p_session_id AND s.user_id = auth.uid();

  UPDATE public.user_session_sign_in_history h
  SET ended_at = now(),
      status = 'ended'
  WHERE h.user_id = auth.uid()
    AND h.session_id = p_session_id
    AND h.ended_at IS NULL;
END;
$$;

DROP FUNCTION IF EXISTS public.revoke_all_user_sessions(boolean);
DROP FUNCTION IF EXISTS public.revoke_all_user_sessions(boolean, uuid);

CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(
  include_current boolean DEFAULT false,
  p_current_session_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  cur uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  cur := p_current_session_id;
  IF cur IS NULL AND NOT include_current THEN
    cur := NULLIF(trim(auth.jwt() ->> 'session_id'), '')::uuid;
  END IF;

  IF include_current THEN
    DELETE FROM auth.sessions s WHERE s.user_id = auth.uid();
    UPDATE public.user_session_sign_in_history h
    SET ended_at = now(), status = 'ended'
    WHERE h.user_id = auth.uid() AND h.ended_at IS NULL;
    DELETE FROM public.user_session_client_info c WHERE c.user_id = auth.uid();
  ELSE
    IF cur IS NULL THEN
      RAISE EXCEPTION 'Current session id required to revoke other sessions';
    END IF;
    DELETE FROM auth.sessions s WHERE s.user_id = auth.uid() AND s.id <> cur;
    UPDATE public.user_session_sign_in_history h
    SET ended_at = now(), status = 'ended'
    WHERE h.user_id = auth.uid()
      AND h.ended_at IS NULL
      AND h.session_id <> cur;
    DELETE FROM public.user_session_client_info c
    WHERE c.user_id = auth.uid() AND c.session_id <> cur;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_user_session_touch(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_active_sessions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_session_history(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_all_user_sessions(boolean, uuid) TO authenticated;
