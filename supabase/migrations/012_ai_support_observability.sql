-- 012: add AI support audit logging and admin-visible observability.

SET search_path = public;

CREATE TABLE IF NOT EXISTS public.support_chat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('accepted', 'rate_limited', 'success', 'error')),
  message_count integer NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  input_char_count integer NOT NULL DEFAULT 0 CHECK (input_char_count >= 0),
  output_char_count integer CHECK (output_char_count IS NULL OR output_char_count >= 0),
  model text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS support_chat_events_user_created_idx
  ON public.support_chat_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS support_chat_events_status_created_idx
  ON public.support_chat_events (status, created_at DESC);

ALTER TABLE public.support_chat_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read support chat events" ON public.support_chat_events;
CREATE POLICY "Admins can read support chat events"
  ON public.support_chat_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );

GRANT SELECT ON public.support_chat_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_chat_events TO service_role;
