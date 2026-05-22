-- 011: consolidate the production backend around Supabase RPCs, audit logs,
-- Edge Function support, and a clean lifecycle model for rides/bookings.

SET search_path = public;

-- ----------------------------------------------------------------------------
-- Schema hardening
-- ----------------------------------------------------------------------------

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.driver_applications
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rides_set_updated_at ON public.rides;
CREATE TRIGGER rides_set_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS bookings_set_updated_at ON public.bookings;
CREATE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS driver_applications_set_updated_at ON public.driver_applications;
CREATE TRIGGER driver_applications_set_updated_at
  BEFORE UPDATE ON public.driver_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('driver_application', 'ride', 'booking', 'profile', 'system')),
  entity_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.backend_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('started', 'success', 'error')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS admin_action_logs_actor_created_idx
  ON public.admin_action_logs (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_action_logs_entity_created_idx
  ON public.admin_action_logs (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS backend_job_runs_job_started_idx
  ON public.backend_job_runs (job_name, started_at DESC);

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backend_job_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read admin action logs" ON public.admin_action_logs;
CREATE POLICY "Admins can read admin action logs"
  ON public.admin_action_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can read backend job runs" ON public.backend_job_runs;
CREATE POLICY "Admins can read backend job runs"
  ON public.backend_job_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Canonical RPCs
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.book_ride(
  p_ride_id uuid,
  p_rider_id uuid,
  p_seats integer,
  p_pickup_address text,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dest_address text,
  p_dest_lat double precision,
  p_dest_lng double precision
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fare_per_seat numeric(10,2);
  v_driver_id uuid;
  v_city text;
  v_departure_time timestamptz;
  v_driver_name text;
  v_vehicle_label text;
  v_booking_id uuid;
  v_existing_booking_id uuid;
  v_existing_booking_status text;
  v_ride_status text;
  v_booking_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_rider_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Rider mismatch';
  END IF;

  IF p_ride_id IS NULL THEN
    RAISE EXCEPTION 'Ride id is required';
  END IF;

  IF COALESCE(p_seats, 0) < 1 THEN
    RAISE EXCEPTION 'At least one seat must be booked';
  END IF;

  SELECT
    r.fare_per_seat,
    r.driver_id,
    r.city,
    r.departure_time,
    r.status,
    p.full_name
  INTO
    v_fare_per_seat,
    v_driver_id,
    v_city,
    v_departure_time,
    v_ride_status,
    v_driver_name
  FROM public.rides AS r
  LEFT JOIN public.profiles AS p
    ON p.id = r.driver_id
  WHERE r.id = p_ride_id
    AND r.status IN ('scheduled', 'active')
    AND r.seats_available >= p_seats
  FOR UPDATE OF r;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not available or not enough seats';
  END IF;

  SELECT
    b.id,
    b.status
  INTO
    v_existing_booking_id,
    v_existing_booking_status
  FROM public.bookings AS b
  WHERE b.ride_id = p_ride_id
    AND b.rider_id = p_rider_id
  ORDER BY b.created_at DESC, b.id DESC
  LIMIT 1
  FOR UPDATE OF b;

  IF v_existing_booking_id IS NOT NULL AND v_existing_booking_status <> 'cancelled' THEN
    RAISE EXCEPTION 'Ride already booked by this rider';
  END IF;

  SELECT NULLIF(concat_ws(' ', v.color, v.make, v.model), '')
  INTO v_vehicle_label
  FROM public.vehicles AS v
  WHERE v.driver_id = v_driver_id
  ORDER BY v.created_at DESC, v.id DESC
  LIMIT 1;

  v_booking_status := CASE
    WHEN v_ride_status = 'active' THEN 'in_progress'
    ELSE 'confirmed'
  END;

  UPDATE public.rides
  SET seats_available = seats_available - p_seats
  WHERE id = p_ride_id;

  IF v_existing_booking_id IS NOT NULL THEN
    UPDATE public.bookings
    SET driver_id = v_driver_id,
        city = COALESCE(v_city, ''),
        pickup_address = COALESCE(p_pickup_address, ''),
        pickup_lat = COALESCE(p_pickup_lat, 0),
        pickup_lng = COALESCE(p_pickup_lng, 0),
        dest_address = COALESCE(p_dest_address, ''),
        dest_lat = COALESCE(p_dest_lat, 0),
        dest_lng = COALESCE(p_dest_lng, 0),
        fare_total = v_fare_per_seat * p_seats,
        fare_shared = v_fare_per_seat,
        seats = p_seats,
        departure_time = v_departure_time,
        driver_name = v_driver_name,
        vehicle_label = v_vehicle_label,
        status = v_booking_status,
        started_at = CASE
          WHEN v_booking_status = 'in_progress' THEN COALESCE(started_at, now())
          ELSE NULL
        END,
        completed_at = NULL,
        cancelled_at = NULL,
        cancel_reason = NULL
    WHERE id = v_existing_booking_id
    RETURNING id INTO v_booking_id;
  ELSE
    INSERT INTO public.bookings (
      ride_id,
      rider_id,
      driver_id,
      city,
      pickup_address,
      pickup_lat,
      pickup_lng,
      dest_address,
      dest_lat,
      dest_lng,
      fare_total,
      fare_shared,
      seats,
      departure_time,
      driver_name,
      vehicle_label,
      status,
      started_at,
      completed_at,
      cancelled_at,
      cancel_reason
    )
    VALUES (
      p_ride_id,
      p_rider_id,
      v_driver_id,
      COALESCE(v_city, ''),
      COALESCE(p_pickup_address, ''),
      COALESCE(p_pickup_lat, 0),
      COALESCE(p_pickup_lng, 0),
      COALESCE(p_dest_address, ''),
      COALESCE(p_dest_lat, 0),
      COALESCE(p_dest_lng, 0),
      v_fare_per_seat * p_seats,
      v_fare_per_seat,
      p_seats,
      v_departure_time,
      v_driver_name,
      v_vehicle_label,
      v_booking_status,
      CASE WHEN v_booking_status = 'in_progress' THEN now() ELSE NULL END,
      NULL,
      NULL,
      NULL
    )
    RETURNING id INTO v_booking_id;
  END IF;

  RETURN v_booking_id;
END;
$$;

DROP FUNCTION IF EXISTS public.cancel_booking(uuid, uuid);
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id uuid,
  p_rider_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride_id uuid;
  v_seats integer;
  v_ride_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_rider_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Rider mismatch';
  END IF;

  SELECT
    b.ride_id,
    b.seats,
    r.status
  INTO
    v_ride_id,
    v_seats,
    v_ride_status
  FROM public.bookings AS b
  JOIN public.rides AS r
    ON r.id = b.ride_id
  WHERE b.id = p_booking_id
    AND b.rider_id = p_rider_id
    AND b.status NOT IN ('cancelled', 'completed')
  FOR UPDATE OF b, r;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or cannot be cancelled';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_at = COALESCE(cancelled_at, now()),
      cancel_reason = COALESCE(cancel_reason, 'Cancelled by rider')
  WHERE id = p_booking_id;

  IF v_ride_status = 'scheduled' THEN
    UPDATE public.rides
    SET seats_available = LEAST(seats_total, seats_available + v_seats)
    WHERE id = v_ride_id;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.start_ride(uuid);
CREATE OR REPLACE FUNCTION public.start_ride(
  p_ride_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_ride_id IS NULL THEN
    RAISE EXCEPTION 'Ride id is required';
  END IF;

  UPDATE public.rides
  SET status = 'active',
      started_at = COALESCE(started_at, v_started_at),
      completed_at = NULL,
      cancelled_at = NULL,
      cancel_reason = NULL
  WHERE id = p_ride_id
    AND driver_id = auth.uid()
    AND status = 'scheduled';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride must be scheduled before it can start';
  END IF;

  UPDATE public.bookings
  SET status = 'in_progress',
      started_at = COALESCE(started_at, v_started_at)
  WHERE ride_id = p_ride_id
    AND status IN ('searching', 'matched', 'confirmed', 'scheduled', 'active');

  RETURN p_ride_id;
END;
$$;

DROP FUNCTION IF EXISTS public.complete_ride(uuid);
CREATE OR REPLACE FUNCTION public.complete_ride(
  p_ride_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_at timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_ride_id IS NULL THEN
    RAISE EXCEPTION 'Ride id is required';
  END IF;

  UPDATE public.rides
  SET status = 'completed',
      completed_at = COALESCE(completed_at, v_completed_at)
  WHERE id = p_ride_id
    AND driver_id = auth.uid()
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride must be active before it can complete';
  END IF;

  UPDATE public.bookings
  SET status = 'completed',
      completed_at = COALESCE(completed_at, v_completed_at)
  WHERE ride_id = p_ride_id
    AND status IN ('searching', 'matched', 'confirmed', 'in_progress', 'scheduled', 'active');

  RETURN p_ride_id;
END;
$$;

DROP FUNCTION IF EXISTS public.cancel_ride_by_driver(uuid, text);
CREATE OR REPLACE FUNCTION public.cancel_ride_by_driver(
  p_ride_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cancelled_at timestamptz := now();
  v_reason text := COALESCE(NULLIF(BTRIM(p_reason), ''), 'Cancelled by driver');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_ride_id IS NULL THEN
    RAISE EXCEPTION 'Ride id is required';
  END IF;

  UPDATE public.rides
  SET status = 'cancelled',
      seats_available = seats_total,
      cancelled_at = COALESCE(cancelled_at, v_cancelled_at),
      cancel_reason = v_reason
  WHERE id = p_ride_id
    AND driver_id = auth.uid()
    AND status IN ('scheduled', 'active');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only scheduled or active rides can be cancelled';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_at = COALESCE(cancelled_at, v_cancelled_at),
      cancel_reason = COALESCE(cancel_reason, v_reason)
  WHERE ride_id = p_ride_id
    AND status NOT IN ('cancelled', 'completed');

  RETURN p_ride_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_rides_with_bookings(
  p_driver_id uuid
)
RETURNS TABLE (
  ride_id uuid,
  origin_name text,
  destination_name text,
  departure_time timestamptz,
  status text,
  booking_count integer,
  passenger_names text,
  total_fare_collected numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_driver_id IS NULL THEN
    RAISE EXCEPTION 'Driver id is required';
  END IF;

  SELECT role
  INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF auth.uid() IS DISTINCT FROM p_driver_id AND v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.origin_name,
    r.destination_name,
    r.departure_time,
    r.status,
    COUNT(b.id) FILTER (WHERE b.status <> 'cancelled')::integer AS booking_count,
    STRING_AGG(DISTINCT p.full_name, ', ' ORDER BY p.full_name) AS passenger_names,
    COALESCE(SUM(b.fare_total) FILTER (WHERE b.status <> 'cancelled'), 0)::numeric AS total_fare_collected
  FROM public.rides AS r
  LEFT JOIN public.bookings AS b
    ON b.ride_id = r.id
  LEFT JOIN public.profiles AS p
    ON p.id = b.rider_id
  WHERE r.driver_id = p_driver_id
  GROUP BY r.id, r.origin_name, r.destination_name, r.departure_time, r.status
  ORDER BY r.departure_time DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.review_driver_application(uuid, text, text);
CREATE OR REPLACE FUNCTION public.review_driver_application(
  p_application_id uuid,
  p_status text,
  p_review_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_previous_status text;
  v_normalized_notes text := NULLIF(BTRIM(p_review_notes), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role
  INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_application_id IS NULL THEN
    RAISE EXCEPTION 'Application id is required';
  END IF;

  IF p_status NOT IN ('approved', 'rejected', 'pending') THEN
    RAISE EXCEPTION 'Invalid application status';
  END IF;

  SELECT status
  INTO v_previous_status
  FROM public.driver_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver application not found';
  END IF;

  UPDATE public.driver_applications
  SET status = p_status,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_notes = v_normalized_notes
  WHERE id = p_application_id;

  INSERT INTO public.admin_action_logs (
    actor_id,
    entity_type,
    entity_id,
    action,
    details
  )
  VALUES (
    auth.uid(),
    'driver_application',
    p_application_id,
    'review_driver_application',
    jsonb_build_object(
      'previous_status', v_previous_status,
      'new_status', p_status,
      'review_notes', v_normalized_notes
    )
  );

  RETURN p_application_id;
END;
$$;

DROP FUNCTION IF EXISTS public.auto_expire_rides();
CREATE OR REPLACE FUNCTION public.auto_expire_rides()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_ids uuid[] := '{}'::uuid[];
  v_expired_count integer := 0;
BEGIN
  WITH expired AS (
    UPDATE public.rides
    SET status = 'cancelled',
        seats_available = seats_total,
        cancelled_at = COALESCE(cancelled_at, now()),
        cancel_reason = COALESCE(cancel_reason, 'Ride window expired')
    WHERE status = 'scheduled'
      AND departure_time < now() - interval '30 minutes'
    RETURNING id
  )
  SELECT
    COALESCE(array_agg(id), '{}'::uuid[]),
    COUNT(*)
  INTO v_expired_ids, v_expired_count
  FROM expired;

  IF v_expired_count > 0 THEN
    UPDATE public.bookings
    SET status = 'cancelled',
        cancelled_at = COALESCE(cancelled_at, now()),
        cancel_reason = COALESCE(cancel_reason, 'Ride window expired')
    WHERE ride_id = ANY(v_expired_ids)
      AND status NOT IN ('cancelled', 'completed');
  END IF;

  RETURN v_expired_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_ride(uuid, uuid, integer, text, double precision, double precision, text, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_ride(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_ride(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_ride_by_driver(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rides_with_bookings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_driver_application(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_expire_rides() TO authenticated, service_role;
