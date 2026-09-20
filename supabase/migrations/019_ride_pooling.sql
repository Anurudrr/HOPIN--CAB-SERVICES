create extension if not exists "pgcrypto";

create table public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.profiles(id) on delete cascade,
  city text not null,
  pickup_address text not null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  dest_address text not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  service_id uuid references public.services(id) on delete set null,
  seats_requested integer not null default 1 check (seats_requested > 0),
  max_fare_per_seat numeric(10,2),
  max_wait_minutes integer not null default 10 check (max_wait_minutes between 1 and 60),
  preferred_departure timestamptz,
  latest_departure timestamptz,
  status text not null default 'searching' check (status in ('searching', 'matched', 'confirmed', 'expired', 'cancelled')),
  matched_ride_id uuid references public.rides(id) on delete set null,
  matched_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

create index ride_requests_rider_idx on public.ride_requests (rider_id, created_at desc);
create index ride_requests_city_status_idx on public.ride_requests (city, status);
create index ride_requests_expires_idx on public.ride_requests (expires_at) where status = 'searching';

create or replace function public.set_ride_request_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.ride_requests enable row level security;

create policy "Riders can read own requests"
  on public.ride_requests
  for select
  using (auth.uid() = rider_id);

create policy "Riders can insert own requests"
  on public.ride_requests
  for insert
  with check (auth.uid() = rider_id);

create policy "Riders can cancel own pending requests"
  on public.ride_requests
  for update
  using (auth.uid() = rider_id and status in ('searching', 'matched'))
  with check (auth.uid() = rider_id and status in ('cancelled', 'expired'));

create policy "Drivers can see matched requests for their rides"
  on public.ride_requests
  for select
  using (
    exists (
      select 1
      from public.rides
      where rides.id = ride_requests.matched_ride_id
        and rides.driver_id = auth.uid()
    )
  );

create policy "Admins can see all ride requests"
  on public.ride_requests
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create or replace function public.find_pool_matches(
  p_request_id uuid,
  p_max_detour_minutes int default 5,
  p_max_pickup_distance_km double precision default 2.0
)
returns table (
  ride_id uuid,
  driver_id uuid,
  driver_name text,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  vehicle_plate text,
  seats_available int,
  fare_per_seat numeric,
  departure_time timestamptz,
  pickup_distance_km double precision,
  dropoff_distance_km double precision,
  detour_minutes int,
  total_distance_km double precision,
  match_score numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
  v_ride record;
  v_origin_point geography := ST_MakePoint(0, 0);
  v_dest_point geography := ST_MakePoint(0, 0);
  v_pickup_point geography;
  v_dropoff_point geography;
begin
  select * into v_request from public.ride_requests where id = p_request_id and status = 'searching';
  if not found then
    return;
  end if;

  v_pickup_point := ST_MakePoint(v_request.pickup_lng, v_request.pickup_lat)::geography;
  v_dropoff_point := ST_MakePoint(v_request.dest_lng, v_request.dest_lat)::geography;

  for v_ride in
    select
      r.id,
      r.driver_id,
      r.origin_lat, r.origin_lng,
      r.destination_lat, r.destination_lng,
      r.departure_time,
      r.seats_available,
      r.fare_per_seat,
      r.status,
      p.full_name as driver_name,
      v.make as vehicle_make,
      v.model as vehicle_model,
      v.color as vehicle_color,
      v.license_plate as vehicle_plate
    from public.rides r
    join public.profiles p on p.id = r.driver_id
    left join public.vehicles v on v.driver_id = r.driver_id
    where r.city = v_request.city
      and r.status in ('scheduled', 'active')
      and r.seats_available >= v_request.seats_requested
      and r.departure_time between v_request.preferred_departure and v_request.latest_departure
      and (v_request.max_fare_per_seat is null or r.fare_per_seat <= v_request.max_fare_per_seat)
      and exists (
        select 1 from public.driver_applications da
        where da.user_id = r.driver_id and da.status = 'approved'
      )
  loop
    v_origin_point := ST_MakePoint(v_ride.origin_lng, v_ride.origin_lat)::geography;
    v_dest_point := ST_MakePoint(v_ride.destination_lng, v_ride.destination_lat)::geography;

    continue when ST_Distance(v_pickup_point, v_origin_point) / 1000 > p_max_pickup_distance_km;
    continue when ST_Distance(v_dropoff_point, v_dest_point) / 1000 > p_max_pickup_distance_km;

    declare
      v_pickup_dist_km double precision := ST_Distance(v_pickup_point, v_origin_point) / 1000;
      v_dropoff_dist_km double precision := ST_Distance(v_dropoff_point, v_dest_point) / 1000;
      v_original_dist_km double precision := ST_Distance(v_origin_point, v_dest_point) / 1000;
      v_new_dist_km double precision := ST_Distance(v_origin_point, v_pickup_point) / 1000
        + ST_Distance(v_pickup_point, v_dropoff_point) / 1000
        + ST_Distance(v_dropoff_point, v_dest_point) / 1000;
      v_detour_km double precision := v_new_dist_km - v_original_dist_km;
      v_detour_min int := round(v_detour_km / 0.5);
      v_score numeric;
    begin
      continue when v_detour_min > p_max_detour_minutes;

      v_score := 100
        - (v_pickup_dist_km * 10)
        - (v_dropoff_dist_km * 10)
        - (v_detour_min * 5)
        - (abs(extract(epoch from (v_ride.departure_time - v_request.preferred_departure)) / 60) * 0.5);

      return query select
        v_ride.id,
        v_ride.driver_id,
        v_ride.driver_name,
        v_ride.vehicle_make,
        v_ride.vehicle_model,
        v_ride.vehicle_color,
        v_ride.vehicle_plate,
        v_ride.seats_available,
        v_ride.fare_per_seat,
        v_ride.departure_time,
        v_pickup_dist_km,
        v_dropoff_dist_km,
        v_detour_min,
        v_new_dist_km,
        v_score;
    end;
  end loop;
end;
$$;

create or replace function public.match_ride_request(
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_ride_id uuid;
begin
  for v_match in select * from public.find_pool_matches(p_request_id) order by match_score desc limit 1
  loop
    update public.rides
    set seats_available = seats_available - (
      select seats_requested from public.ride_requests where id = p_request_id
    )
    where id = v_match.ride_id;

    update public.ride_requests
    set
      status = 'matched',
      matched_ride_id = v_match.ride_id,
      matched_at = now()
    where id = p_request_id;

    v_ride_id := v_match.ride_id;
    exit;
  end loop;

  return v_ride_id;
end;
$$;

create or replace function public.expire_ride_requests()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  update public.ride_requests
  set status = 'expired'
  where status = 'searching'
    and expires_at < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.create_ride_request(
  p_rider_id uuid,
  p_city text,
  p_pickup_address text,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dest_address text,
  p_dest_lat double precision,
  p_dest_lng double precision,
  p_service_id uuid default null,
  p_seats_requested int default 1,
  p_max_fare_per_seat numeric default null,
  p_max_wait_minutes int default 10,
  p_preferred_departure timestamptz,
  p_latest_departure timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  insert into public.ride_requests (
    rider_id, city, pickup_address, pickup_lat, pickup_lng,
    dest_address, dest_lat, dest_lng,
    service_id, seats_requested, max_fare_per_seat,
    max_wait_minutes, preferred_departure, latest_departure,
    expires_at
  ) values (
    p_rider_id, p_city, p_pickup_address, p_pickup_lat, p_pickup_lng,
    p_dest_address, p_dest_lat, p_dest_lng,
    p_service_id, p_seats_requested, p_max_fare_per_seat,
    p_max_wait_minutes, p_preferred_departure, p_latest_departure,
    p_latest_departure + interval '20 minutes'
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.get_ride_request_with_matches(p_request_id uuid)
returns table (
  request_id uuid,
  status text,
  matched_ride_id uuid,
  ride_driver_id uuid,
  ride_driver_name text,
  ride_vehicle_make text,
  ride_vehicle_model text,
  ride_vehicle_color text,
  ride_vehicle_plate text,
  ride_seats_available int,
  ride_fare_per_seat numeric,
  ride_departure_time timestamptz,
  ride_status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    rr.id,
    rr.status,
    rr.matched_ride_id,
    r.driver_id,
    p.full_name,
    v.make,
    v.model,
    v.color,
    v.license_plate,
    r.seats_available,
    r.fare_per_seat,
    r.departure_time,
    r.status
  from public.ride_requests rr
  left join public.rides r on r.id = rr.matched_ride_id
  left join public.profiles p on p.id = r.driver_id
  left join public.vehicles v on v.driver_id = r.driver_id
  where rr.id = p_request_id;
end;
$$;