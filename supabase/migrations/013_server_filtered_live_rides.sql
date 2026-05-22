-- 013: use server time for live ride availability and return frontend-ready rows.

SET search_path = public;

DROP FUNCTION IF EXISTS public.get_available_rides(text);
CREATE OR REPLACE FUNCTION public.get_available_rides(
  p_city text
)
RETURNS TABLE (
  id uuid,
  driver_id uuid,
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
    AND r.departure_time >= now()
  ORDER BY r.departure_time ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_rides(text) TO authenticated;
