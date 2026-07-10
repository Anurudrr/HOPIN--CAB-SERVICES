-- 015: align booking/runtime functions with the current frontend contract.

SET search_path = public;

-- Normalize legacy booking states into the provider workflow used by the UI.
UPDATE public.bookings
SET status = 'pending'
WHERE status = 'confirmed';

UPDATE public.bookings
SET
  status = 'ongoing',
  accepted_at = COALESCE(accepted_at, created_at),
  arriving_at = COALESCE(arriving_at, accepted_at, created_at),
  ongoing_at = COALESCE(ongoing_at, started_at, arriving_at, accepted_at, created_at)
WHERE status = 'in_progress';

-- Ensure newer booking metadata stays populated for rows created before this alignment.
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
    ELSE ROUND(COALESCE(NULLIF(b.subtotal_amount, 0), b.fare_total, 0) * 0.08, 2)
  END,
  tax_amount = CASE
    WHEN b.tax_amount > 0 THEN b.tax_amount
    ELSE ROUND(COALESCE(NULLIF(b.subtotal_amount, 0), b.fare_total, 0) * 0.05, 2)
  END,
  invoice_number = COALESCE(b.invoice_number, 'INV-' || upper(substr(replace(b.id::text, '-', ''), 1, 8))),
  accepted_at = CASE
    WHEN b.status IN ('accepted', 'arriving', 'ongoing', 'completed')
      THEN COALESCE(b.accepted_at, b.created_at)
    ELSE b.accepted_at
  END,
  arriving_at = CASE
    WHEN b.status IN ('arriving', 'ongoing', 'completed')
      THEN COALESCE(b.arriving_at, b.accepted_at, b.created_at)
    ELSE b.arriving_at
  END,
  ongoing_at = CASE
    WHEN b.status IN ('ongoing', 'completed')
      THEN COALESCE(b.ongoing_at, b.started_at, b.arriving_at, b.accepted_at, b.created_at)
    ELSE b.ongoing_at
  END
WHERE b.service_id IS NULL
   OR b.provider_id IS NULL
   OR b.booking_code IS NULL
   OR b.qr_token IS NULL
   OR b.invoice_number IS NULL
   OR b.status IN ('confirmed', 'in_progress');

DROP FUNCTION IF EXISTS public.get_available_rides(text);
CREATE OR REPLACE FUNCTION public.get_available_rides(
  p_city text
)
RETURNS TABLE (
  id uuid,
  driver_id uuid,
  service_id uuid,
  origin_name text,
  origin_lat double precision,
  origin_lng double precision,
  destination_name text,
  destination_lat double precision,
  destination_lng double precision,
  city text,
  departure_time timestamptz,
  seats_total integer,
  seats_available integer,
  fare_per_seat numeric,
  status text,
  created_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  driver jsonb,
  vehicle jsonb
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.driver_id,
    r.service_id,
    r.origin_name,
    r.origin_lat,
    r.origin_lng,
    r.destination_name,
    r.destination_lat,
    r.destination_lng,
    r.city,
    r.departure_time,
    r.seats_total,
    r.seats_available,
    r.fare_per_seat,
    r.status,
    r.created_at,
    r.started_at,
    r.completed_at,
    r.cancelled_at,
    r.cancel_reason,
    CASE
      WHEN p.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url
      )
    END AS driver,
    CASE
      WHEN v.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'make', v.make,
        'model', v.model,
        'color', v.color,
        'license_plate', v.license_plate
      )
    END AS vehicle
  FROM public.rides AS r
  LEFT JOIN public.profiles AS p
    ON p.id = r.driver_id
  LEFT JOIN LATERAL (
    SELECT
      vehicles.id,
      vehicles.make,
      vehicles.model,
      vehicles.color,
      vehicles.license_plate
    FROM public.vehicles
    WHERE vehicles.driver_id = r.driver_id
    ORDER BY vehicles.created_at DESC, vehicles.id DESC
    LIMIT 1
  ) AS v
    ON true
  WHERE r.city = NULLIF(BTRIM(p_city), '')
    AND r.status IN ('scheduled', 'active')
    AND r.seats_available > 0
    AND (r.status = 'active' OR r.departure_time >= now())
  ORDER BY
    CASE WHEN r.status = 'active' THEN 0 ELSE 1 END,
    r.departure_time ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_rides(text) TO authenticated;

DROP FUNCTION IF EXISTS public.book_ride(
  uuid,
  uuid,
  integer,
  text,
  double precision,
  double precision,
  text,
  double precision,
  double precision
);

DROP FUNCTION IF EXISTS public.book_ride(
  uuid,
  uuid,
  integer,
  text,
  double precision,
  double precision,
  text,
  double precision,
  double precision,
  uuid,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  integer,
  text
);

CREATE OR REPLACE FUNCTION public.book_ride(
  p_ride_id uuid,
  p_rider_id uuid,
  p_seats integer,
  p_pickup_address text,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dest_address text,
  p_dest_lat double precision,
  p_dest_lng double precision,
  p_service_id uuid DEFAULT NULL,
  p_fare_total numeric DEFAULT NULL,
  p_subtotal_amount numeric DEFAULT NULL,
  p_platform_fee numeric DEFAULT NULL,
  p_tax_amount numeric DEFAULT NULL,
  p_distance_km numeric DEFAULT NULL,
  p_eta_minutes integer DEFAULT NULL,
  p_special_instructions text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fare_per_seat numeric(10,2);
  v_driver_id uuid;
  v_service_id uuid;
  v_provider_id uuid;
  v_city text;
  v_departure_time timestamptz;
  v_driver_name text;
  v_vehicle_label text;
  v_booking_id uuid;
  v_existing_booking_id uuid;
  v_existing_booking_status text;
  v_ride_status text;
  v_booking_status text;
  v_base_total numeric(10,2);
  v_subtotal numeric(10,2);
  v_platform_fee numeric(10,2);
  v_tax_amount numeric(10,2);
  v_total numeric(10,2);
  v_booking_code text;
  v_qr_token text;
  v_invoice_number text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> p_rider_id THEN
    RAISE EXCEPTION 'You can only book rides for yourself';
  END IF;

  IF p_seats IS NULL OR p_seats <= 0 THEN
    RAISE EXCEPTION 'Seats must be greater than zero';
  END IF;

  SELECT
    r.fare_per_seat,
    r.driver_id,
    r.service_id,
    r.city,
    r.departure_time,
    r.status,
    p.full_name
  INTO
    v_fare_per_seat,
    v_driver_id,
    v_service_id,
    v_city,
    v_departure_time,
    v_ride_status,
    v_driver_name
  FROM public.rides AS r
  LEFT JOIN public.profiles AS p
    ON p.id = r.driver_id
  WHERE r.id = p_ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF v_ride_status NOT IN ('scheduled', 'active') THEN
    RAISE EXCEPTION 'Ride is no longer available';
  END IF;

  UPDATE public.rides
  SET seats_available = seats_available - p_seats
  WHERE id = p_ride_id
    AND seats_available >= p_seats;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient seats available';
  END IF;

  SELECT concat_ws(' ', v.color, v.make, v.model)
  INTO v_vehicle_label
  FROM public.vehicles AS v
  WHERE v.driver_id = v_driver_id
  ORDER BY v.created_at DESC, v.id DESC
  LIMIT 1;

  SELECT pr.id
  INTO v_provider_id
  FROM public.providers AS pr
  WHERE pr.profile_id = v_driver_id
  LIMIT 1;

  v_booking_status := CASE
    WHEN v_ride_status = 'active' THEN 'ongoing'
    ELSE 'pending'
  END;

  v_base_total := ROUND(COALESCE(v_fare_per_seat, 0) * p_seats, 2);
  v_subtotal := GREATEST(COALESCE(p_subtotal_amount, v_base_total), v_base_total);
  v_platform_fee := COALESCE(p_platform_fee, ROUND(v_subtotal * 0.08, 2));
  v_tax_amount := COALESCE(p_tax_amount, ROUND(v_subtotal * 0.05, 2));
  v_total := GREATEST(
    COALESCE(p_fare_total, v_subtotal + v_platform_fee + v_tax_amount),
    v_base_total,
    v_subtotal + v_platform_fee + v_tax_amount
  );

  SELECT b.id, b.status
  INTO v_existing_booking_id, v_existing_booking_status
  FROM public.bookings AS b
  WHERE b.ride_id = p_ride_id
    AND b.rider_id = p_rider_id
  ORDER BY b.created_at DESC, b.id DESC
  LIMIT 1;

  IF v_existing_booking_id IS NOT NULL AND COALESCE(v_existing_booking_status, '') <> 'cancelled' THEN
    RAISE EXCEPTION 'You already have a booking for this ride';
  END IF;

  IF v_existing_booking_id IS NOT NULL THEN
    UPDATE public.bookings
    SET
      driver_id = v_driver_id,
      service_id = COALESCE(p_service_id, v_service_id),
      provider_id = v_provider_id,
      city = v_city,
      pickup_address = COALESCE(p_pickup_address, ''),
      pickup_lat = COALESCE(p_pickup_lat, 0),
      pickup_lng = COALESCE(p_pickup_lng, 0),
      dest_address = COALESCE(p_dest_address, ''),
      dest_lat = COALESCE(p_dest_lat, 0),
      dest_lng = COALESCE(p_dest_lng, 0),
      fare_total = v_total,
      subtotal_amount = v_subtotal,
      platform_fee = v_platform_fee,
      tax_amount = v_tax_amount,
      distance_km = CASE
        WHEN p_distance_km IS NULL THEN NULL
        ELSE GREATEST(p_distance_km, 0)
      END,
      eta_minutes = CASE
        WHEN p_eta_minutes IS NULL THEN NULL
        ELSE GREATEST(p_eta_minutes, 0)
      END,
      fare_shared = COALESCE(v_fare_per_seat, 0),
      seats = p_seats,
      special_instructions = NULLIF(BTRIM(p_special_instructions), ''),
      departure_time = v_departure_time,
      driver_name = v_driver_name,
      vehicle_label = v_vehicle_label,
      status = v_booking_status,
      accepted_at = CASE
        WHEN v_booking_status = 'ongoing' THEN COALESCE(accepted_at, now())
        ELSE NULL
      END,
      arriving_at = CASE
        WHEN v_booking_status = 'ongoing' THEN COALESCE(arriving_at, now())
        ELSE NULL
      END,
      ongoing_at = CASE
        WHEN v_booking_status = 'ongoing' THEN COALESCE(ongoing_at, started_at, now())
        ELSE NULL
      END,
      started_at = CASE
        WHEN v_booking_status = 'ongoing' THEN COALESCE(started_at, now())
        ELSE NULL
      END,
      completed_at = NULL,
      cancelled_at = NULL,
      cancel_reason = NULL,
      provider_notes = NULL
    WHERE id = v_existing_booking_id
    RETURNING id INTO v_booking_id;
  ELSE
    INSERT INTO public.bookings (
      ride_id,
      service_id,
      provider_id,
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
      subtotal_amount,
      platform_fee,
      tax_amount,
      distance_km,
      eta_minutes,
      fare_shared,
      seats,
      special_instructions,
      departure_time,
      driver_name,
      vehicle_label,
      status,
      accepted_at,
      arriving_at,
      ongoing_at,
      started_at,
      completed_at,
      cancelled_at,
      cancel_reason
    )
    VALUES (
      p_ride_id,
      COALESCE(p_service_id, v_service_id),
      v_provider_id,
      p_rider_id,
      v_driver_id,
      v_city,
      COALESCE(p_pickup_address, ''),
      COALESCE(p_pickup_lat, 0),
      COALESCE(p_pickup_lng, 0),
      COALESCE(p_dest_address, ''),
      COALESCE(p_dest_lat, 0),
      COALESCE(p_dest_lng, 0),
      v_total,
      v_subtotal,
      v_platform_fee,
      v_tax_amount,
      CASE
        WHEN p_distance_km IS NULL THEN NULL
        ELSE GREATEST(p_distance_km, 0)
      END,
      CASE
        WHEN p_eta_minutes IS NULL THEN NULL
        ELSE GREATEST(p_eta_minutes, 0)
      END,
      COALESCE(v_fare_per_seat, 0),
      p_seats,
      NULLIF(BTRIM(p_special_instructions), ''),
      v_departure_time,
      v_driver_name,
      v_vehicle_label,
      v_booking_status,
      CASE WHEN v_booking_status = 'ongoing' THEN now() ELSE NULL END,
      CASE WHEN v_booking_status = 'ongoing' THEN now() ELSE NULL END,
      CASE WHEN v_booking_status = 'ongoing' THEN now() ELSE NULL END,
      CASE WHEN v_booking_status = 'ongoing' THEN now() ELSE NULL END,
      NULL,
      NULL,
      NULL
    )
    RETURNING id INTO v_booking_id;
  END IF;

  v_booking_code := upper(substr(replace(v_booking_id::text, '-', ''), 1, 10));
  v_qr_token := replace(gen_random_uuid()::text, '-', '');
  v_invoice_number := 'INV-' || upper(substr(replace(v_booking_id::text, '-', ''), 1, 8));

  UPDATE public.bookings
  SET
    booking_code = COALESCE(booking_code, v_booking_code),
    qr_token = COALESCE(qr_token, v_qr_token),
    invoice_number = COALESCE(invoice_number, v_invoice_number)
  WHERE id = v_booking_id;

  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_ride(
  uuid,
  uuid,
  integer,
  text,
  double precision,
  double precision,
  text,
  double precision,
  double precision,
  uuid,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  integer,
  text
) TO authenticated;
