SET search_path = public;

-- 017: public function protection and notification support.

CREATE TABLE IF NOT EXISTS public.function_rate_limits (
  scope text NOT NULL,
  ip_address text NOT NULL,
  bucket_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, ip_address, bucket_start)
);

CREATE INDEX IF NOT EXISTS function_rate_limits_updated_idx
  ON public.function_rate_limits (updated_at DESC);

ALTER TABLE public.function_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read function rate limits" ON public.function_rate_limits;
CREATE POLICY "Admins can read function rate limits"
  ON public.function_rate_limits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.consume_function_rate_limit(
  p_scope text,
  p_ip_address text,
  p_bucket_start timestamptz,
  p_max_requests integer
)
RETURNS TABLE (
  allowed boolean,
  request_count integer,
  remaining integer,
  resets_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope text := NULLIF(BTRIM(p_scope), '');
  v_ip_address text := NULLIF(BTRIM(p_ip_address), '');
  v_request_count integer;
BEGIN
  IF v_scope IS NULL THEN
    RAISE EXCEPTION 'Rate limit scope is required';
  END IF;

  IF v_ip_address IS NULL THEN
    RAISE EXCEPTION 'Rate limit IP address is required';
  END IF;

  IF p_bucket_start IS NULL THEN
    RAISE EXCEPTION 'Rate limit bucket start is required';
  END IF;

  IF COALESCE(p_max_requests, 0) < 1 THEN
    RAISE EXCEPTION 'Rate limit max requests must be positive';
  END IF;

  INSERT INTO public.function_rate_limits (
    scope,
    ip_address,
    bucket_start,
    request_count,
    updated_at
  )
  VALUES (
    v_scope,
    v_ip_address,
    p_bucket_start,
    1,
    now()
  )
  ON CONFLICT (scope, ip_address, bucket_start)
  DO UPDATE
    SET request_count = public.function_rate_limits.request_count + 1,
        updated_at = now()
  RETURNING public.function_rate_limits.request_count
  INTO v_request_count;

  RETURN QUERY
  SELECT
    v_request_count <= p_max_requests,
    v_request_count,
    GREATEST(p_max_requests - v_request_count, 0),
    p_bucket_start + interval '1 hour';
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_function_rate_limit(text, text, timestamptz, integer)
  TO service_role;

CREATE INDEX IF NOT EXISTS rides_city_status_departure_idx
  ON public.rides (city, status, departure_time)
  WHERE status IN ('scheduled', 'active');
