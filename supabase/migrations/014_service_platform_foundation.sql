-- 014: expand HopIn into a production-style service booking platform while
-- keeping compatibility with the existing ride/route backend.

SET search_path = public;

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  base_fare numeric(10,2) NOT NULL DEFAULT 0 CHECK (base_fare >= 0),
  price_per_km numeric(10,2) NOT NULL DEFAULT 0 CHECK (price_per_km >= 0),
  price_per_minute numeric(10,2) NOT NULL DEFAULT 0 CHECK (price_per_minute >= 0),
  icon_name text,
  accent_label text,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  headline text,
  bio text,
  availability_status text NOT NULL DEFAULT 'offline'
    CHECK (availability_status IN ('available', 'busy', 'offline')),
  is_available boolean NOT NULL DEFAULT false,
  rating numeric(3,2) NOT NULL DEFAULT 4.80 CHECK (rating >= 0 AND rating <= 5),
  total_reviews integer NOT NULL DEFAULT 0 CHECK (total_reviews >= 0),
  completed_bookings integer NOT NULL DEFAULT 0 CHECK (completed_bookings >= 0),
  service_radius_km numeric(10,2) NOT NULL DEFAULT 12 CHECK (service_radius_km >= 0),
  response_time_min integer NOT NULL DEFAULT 8 CHECK (response_time_min >= 0),
  current_lat double precision,
  current_lng double precision,
  current_address text,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text NOT NULL,
  address text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL
    CHECK (kind IN ('booking_created', 'booking_status', 'system', 'review', 'payment', 'security')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  platform_fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  tax_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  payment_method text NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'upi', 'card', 'wallet')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS qr_token text,
  ADD COLUMN IF NOT EXISTS subtotal_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  ADD COLUMN IF NOT EXISTS platform_fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  ADD COLUMN IF NOT EXISTS distance_km numeric(10,2) CHECK (distance_km IS NULL OR distance_km >= 0),
  ADD COLUMN IF NOT EXISTS eta_minutes integer CHECK (eta_minutes IS NULL OR eta_minutes >= 0),
  ADD COLUMN IF NOT EXISTS special_instructions text,
  ADD COLUMN IF NOT EXISTS provider_notes text,
  ADD COLUMN IF NOT EXISTS rebooked_from_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS arriving_at timestamptz,
  ADD COLUMN IF NOT EXISTS ongoing_at timestamptz;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (
    status IN (
      'pending',
      'accepted',
      'arriving',
      'ongoing',
      'completed',
      'cancelled',
      'searching',
      'matched',
      'confirmed',
      'in_progress',
      'scheduled',
      'active'
    )
  );

CREATE INDEX IF NOT EXISTS rides_service_departure_idx
  ON public.rides (service_id, city, departure_time DESC);

CREATE INDEX IF NOT EXISTS bookings_provider_status_idx
  ON public.bookings (provider_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_receiver_created_idx
  ON public.notifications (receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS saved_locations_user_created_idx
  ON public.saved_locations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS reviews_provider_created_idx
  ON public.reviews (provider_id, created_at DESC);

INSERT INTO public.services (slug, name, category, description, base_fare, price_per_km, price_per_minute, icon_name, accent_label, is_featured)
VALUES
  ('city-transfer', 'City Transfer', 'Mobility', 'Point-to-point city bookings with route tracking and clear fare visibility.', 89, 18, 3, 'Car', 'Fast lanes', true),
  ('event-shuttle', 'Event Shuttle', 'Events', 'Group pickup and venue transfer coordination for campus and city events.', 149, 22, 3, 'Calendar', 'Event-ready', true),
  ('campus-commute', 'Campus Commute', 'College', 'Recurring campus corridor bookings for students, clubs, and teams.', 69, 14, 2, 'GraduationCap', 'Student pick', true),
  ('outstation-drop', 'Outstation Drop', 'Travel', 'Long-distance routes with scheduled provider confirmations and status tracking.', 299, 25, 4, 'Map', 'Long haul', false),
  ('equipment-move', 'Equipment Move', 'Logistics', 'Coordinate light event equipment or crew movement with verified providers.', 199, 20, 3, 'Package', 'Ops support', false)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  base_fare = EXCLUDED.base_fare,
  price_per_km = EXCLUDED.price_per_km,
  price_per_minute = EXCLUDED.price_per_minute,
  icon_name = EXCLUDED.icon_name,
  accent_label = EXCLUDED.accent_label,
  is_featured = EXCLUDED.is_featured,
  is_active = true,
  updated_at = now();

INSERT INTO public.providers (
  profile_id,
  headline,
  bio,
  availability_status,
  is_available,
  rating,
  total_reviews,
  completed_bookings,
  last_seen_at
)
SELECT
  p.id,
  'Verified HopIn provider',
  'Provider profile migrated from the existing HopIn driver stack.',
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.rides AS r
      WHERE r.driver_id = p.id
        AND r.status IN ('scheduled', 'active')
    ) THEN 'available'
    ELSE 'offline'
  END,
  EXISTS (
    SELECT 1
    FROM public.rides AS r
    WHERE r.driver_id = p.id
      AND r.status IN ('scheduled', 'active')
  ),
  4.8,
  0,
  (
    SELECT COUNT(*)
    FROM public.bookings AS b
    WHERE b.driver_id = p.id
      AND b.status = 'completed'
  )::integer,
  now()
FROM public.profiles AS p
WHERE EXISTS (
  SELECT 1
  FROM public.driver_applications AS da
  WHERE da.user_id = p.id
    AND da.status = 'approved'
)
ON CONFLICT (profile_id) DO NOTHING;

UPDATE public.rides
SET service_id = (
  SELECT id
  FROM public.services
  WHERE slug = 'city-transfer'
)
WHERE service_id IS NULL;

UPDATE public.bookings AS b
SET
  service_id = COALESCE(
    b.service_id,
    (
      SELECT r.service_id
      FROM public.rides AS r
      WHERE r.id = b.ride_id
    )
  ),
  provider_id = COALESCE(
    b.provider_id,
    (
      SELECT pr.id
      FROM public.providers AS pr
      WHERE pr.profile_id = b.driver_id
      LIMIT 1
    )
  ),
  booking_code = COALESCE(b.booking_code, upper(substr(replace(b.id::text, '-', ''), 1, 10))),
  qr_token = COALESCE(b.qr_token, replace(gen_random_uuid()::text, '-', '')),
  subtotal_amount = CASE
    WHEN b.subtotal_amount > 0 THEN b.subtotal_amount
    ELSE COALESCE(b.fare_total, 0)
  END,
  platform_fee = CASE
    WHEN b.platform_fee > 0 THEN b.platform_fee
    ELSE ROUND(COALESCE(b.fare_total, 0) * 0.08, 2)
  END,
  tax_amount = CASE
    WHEN b.tax_amount > 0 THEN b.tax_amount
    ELSE ROUND(COALESCE(b.fare_total, 0) * 0.05, 2)
  END,
  invoice_number = COALESCE(b.invoice_number, 'INV-' || upper(substr(replace(b.id::text, '-', ''), 1, 8)))
WHERE b.booking_code IS NULL
   OR b.service_id IS NULL
   OR b.provider_id IS NULL
   OR b.qr_token IS NULL
   OR b.subtotal_amount = 0
   OR b.invoice_number IS NULL;

INSERT INTO public.saved_locations (user_id, label, address, lat, lng, is_default)
SELECT
  p.id,
  'Home',
  p.home_address,
  0,
  0,
  true
FROM public.profiles AS p
WHERE p.home_address IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.saved_locations AS sl
    WHERE sl.user_id = p.id
      AND sl.label = 'Home'
  );

INSERT INTO public.saved_locations (user_id, label, address, lat, lng, is_default)
SELECT
  p.id,
  'Work',
  p.work_address,
  0,
  0,
  false
FROM public.profiles AS p
WHERE p.work_address IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.saved_locations AS sl
    WHERE sl.user_id = p.id
      AND sl.label = 'Work'
  );

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active services are readable" ON public.services;
CREATE POLICY "Active services are readable"
  ON public.services
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage services" ON public.services;
CREATE POLICY "Admins manage services"
  ON public.services
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Providers and admins read providers" ON public.providers;
CREATE POLICY "Providers and admins read providers"
  ON public.providers
  FOR SELECT
  USING (
    is_available = true
    OR profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Providers manage own provider profile" ON public.providers;
CREATE POLICY "Providers manage own provider profile"
  ON public.providers
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own saved locations" ON public.saved_locations;
CREATE POLICY "Users manage own saved locations"
  ON public.saved_locations
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications
  FOR SELECT
  USING (receiver_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all notifications" ON public.notifications;
CREATE POLICY "Admins read all notifications"
  ON public.notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

DROP POLICY IF EXISTS "Users read own transactions" ON public.transactions;
CREATE POLICY "Users read own transactions"
  ON public.transactions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.providers AS provider_profile
      WHERE provider_profile.id = transactions.provider_id
        AND provider_profile.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users read reviews" ON public.reviews;
CREATE POLICY "Users read reviews"
  ON public.reviews
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins read all rides" ON public.rides;
CREATE POLICY "Admins read all rides"
  ON public.rides
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins read all bookings" ON public.bookings;
CREATE POLICY "Admins read all bookings"
  ON public.bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins read all vehicles" ON public.vehicles;
CREATE POLICY "Admins read all vehicles"
  ON public.vehicles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins read all driver applications" ON public.driver_applications;
CREATE POLICY "Admins read all driver applications"
  ON public.driver_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Completed riders can create reviews" ON public.reviews;
CREATE POLICY "Completed riders can create reviews"
  ON public.reviews
  FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.bookings AS b
      WHERE b.id = booking_id
        AND b.rider_id = auth.uid()
        AND b.status = 'completed'
    )
  );

CREATE OR REPLACE FUNCTION public.sync_provider_aggregates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.providers
  SET
    total_reviews = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE reviews.provider_id = providers.id
    ),
    rating = COALESCE((
      SELECT ROUND(AVG(reviews.rating)::numeric, 2)
      FROM public.reviews
      WHERE reviews.provider_id = providers.id
    ), 4.80),
    completed_bookings = (
      SELECT COUNT(*)
      FROM public.bookings
      WHERE bookings.provider_id = providers.id
        AND bookings.status = 'completed'
    ),
    updated_at = now()
  WHERE providers.id = COALESCE(NEW.provider_id, OLD.provider_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reviews_sync_provider_aggregates ON public.reviews;
CREATE TRIGGER reviews_sync_provider_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_provider_aggregates();

DROP TRIGGER IF EXISTS bookings_sync_provider_aggregates ON public.bookings;
CREATE TRIGGER bookings_sync_provider_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_provider_aggregates();

CREATE OR REPLACE FUNCTION public.booking_notifications_and_transactions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_provider_profile_id uuid;
  v_service_name text;
BEGIN
  SELECT profile_id
  INTO v_provider_profile_id
  FROM public.providers
  WHERE id = NEW.provider_id;

  SELECT name
  INTO v_service_name
  FROM public.services
  WHERE id = NEW.service_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (receiver_id, actor_id, title, body, kind, metadata)
    VALUES (
      NEW.rider_id,
      v_provider_profile_id,
      'Booking created',
      format('Your %s booking is now in the queue.', COALESCE(v_service_name, 'service')),
      'booking_created',
      jsonb_build_object('booking_id', NEW.id, 'status', NEW.status)
    );

    IF v_provider_profile_id IS NOT NULL THEN
      INSERT INTO public.notifications (receiver_id, actor_id, title, body, kind, metadata)
      VALUES (
        v_provider_profile_id,
        NEW.rider_id,
        'New booking request',
        format('A new booking is waiting for your response for %s.', COALESCE(v_service_name, 'a service')),
        'booking_created',
        jsonb_build_object('booking_id', NEW.id, 'status', NEW.status)
      );
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (receiver_id, actor_id, title, body, kind, metadata)
    VALUES (
      NEW.rider_id,
      v_provider_profile_id,
      'Booking status updated',
      format('Your booking is now %s.', NEW.status),
      'booking_status',
      jsonb_build_object('booking_id', NEW.id, 'status', NEW.status)
    );

    IF v_provider_profile_id IS NOT NULL THEN
      INSERT INTO public.notifications (receiver_id, actor_id, title, body, kind, metadata)
      VALUES (
        v_provider_profile_id,
        NEW.rider_id,
        'Booking status synced',
        format('Booking %s is now %s.', COALESCE(NEW.booking_code, NEW.id::text), NEW.status),
        'booking_status',
        jsonb_build_object('booking_id', NEW.id, 'status', NEW.status)
      );
    END IF;

    IF NEW.status = 'completed' THEN
      INSERT INTO public.transactions (
        booking_id,
        user_id,
        provider_id,
        amount,
        platform_fee,
        tax_amount,
        payment_method,
        status
      )
      VALUES (
        NEW.id,
        NEW.rider_id,
        NEW.provider_id,
        COALESCE(NEW.fare_total, 0),
        COALESCE(NEW.platform_fee, 0),
        COALESCE(NEW.tax_amount, 0),
        'cash',
        'paid'
      )
      ON CONFLICT (booking_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_notifications_and_transactions ON public.bookings;
CREATE TRIGGER bookings_notifications_and_transactions
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.booking_notifications_and_transactions();

CREATE OR REPLACE FUNCTION public.provider_set_booking_status(
  p_booking_id uuid,
  p_status text,
  p_provider_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_booking_id IS NULL THEN
    RAISE EXCEPTION 'Booking id is required';
  END IF;

  IF p_status NOT IN ('accepted', 'arriving', 'ongoing', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid booking status';
  END IF;

  SELECT pr.id
  INTO v_provider_id
  FROM public.providers AS pr
  WHERE pr.profile_id = auth.uid();

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Provider profile not found';
  END IF;

  UPDATE public.bookings AS b
  SET
    provider_id = v_provider_id,
    driver_id = auth.uid(),
    status = p_status,
    provider_notes = COALESCE(NULLIF(BTRIM(p_provider_notes), ''), b.provider_notes),
    accepted_at = CASE WHEN p_status = 'accepted' THEN COALESCE(b.accepted_at, now()) ELSE b.accepted_at END,
    arriving_at = CASE WHEN p_status = 'arriving' THEN COALESCE(b.arriving_at, now()) ELSE b.arriving_at END,
    ongoing_at = CASE WHEN p_status = 'ongoing' THEN COALESCE(b.ongoing_at, now()) ELSE b.ongoing_at END,
    started_at = CASE WHEN p_status = 'ongoing' THEN COALESCE(b.started_at, now()) ELSE b.started_at END,
    completed_at = CASE WHEN p_status = 'completed' THEN COALESCE(b.completed_at, now()) ELSE b.completed_at END,
    cancelled_at = CASE WHEN p_status = 'cancelled' THEN COALESCE(b.cancelled_at, now()) ELSE b.cancelled_at END,
    cancel_reason = CASE WHEN p_status = 'cancelled' THEN COALESCE(b.cancel_reason, 'Cancelled by provider') ELSE b.cancel_reason END
  FROM public.rides AS r
  WHERE b.id = p_booking_id
    AND r.id = b.ride_id
    AND r.driver_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider cannot update this booking';
  END IF;

  IF p_status = 'ongoing' THEN
    UPDATE public.rides
    SET status = 'active',
        started_at = COALESCE(started_at, now())
    WHERE id = (
      SELECT ride_id
      FROM public.bookings
      WHERE id = p_booking_id
    );
  ELSIF p_status = 'completed' THEN
    UPDATE public.rides
    SET status = 'completed',
        completed_at = COALESCE(completed_at, now())
    WHERE id = (
      SELECT ride_id
      FROM public.bookings
      WHERE id = p_booking_id
    );
  END IF;

  RETURN p_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provider_set_booking_status(uuid, text, text) TO authenticated;
