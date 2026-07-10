SET search_path = public;

-- 016: cleanup and hardening follow-up.
-- This migration uses 016 because 014 and 015 already exist in the current
-- worktree and should not be overwritten.

-- Fix 1: Remove profile completion triggers that conflict with explicit
-- onboarding_completed management in the frontend.
DROP TRIGGER IF EXISTS tr_profile_completion ON public.profiles;
DROP TRIGGER IF EXISTS tr_profile_completion_insert ON public.profiles;
DROP FUNCTION IF EXISTS public.check_profile_completion();

-- Fix 2: Ensure driver_applications.updated_at trigger exists.
DROP TRIGGER IF EXISTS driver_applications_set_updated_at ON public.driver_applications;
CREATE TRIGGER driver_applications_set_updated_at
  BEFORE UPDATE ON public.driver_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Fix 3: Add avatars storage bucket for profile photos.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;
CREATE POLICY "Anyone can read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Fix 4: Add missing composite index for live ride queries.
CREATE INDEX IF NOT EXISTS rides_city_status_departure_filtered_idx
  ON public.rides (city, departure_time ASC)
  WHERE status IN ('scheduled', 'active') AND seats_available > 0;

-- Fix 5: Add index on support_chat_events for rate-limit and audit queries.
CREATE INDEX IF NOT EXISTS support_chat_events_user_status_created_idx
  ON public.support_chat_events (user_id, status, created_at DESC);
