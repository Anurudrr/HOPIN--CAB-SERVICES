create extension if not exists "pgcrypto";

create table public.driver_locations (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  ride_id uuid references public.rides(id) on delete set null,
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  speed_kmh double precision,
  accuracy_meters double precision,
  is_online boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index driver_locations_driver_id_idx on public.driver_locations (driver_id);
create index driver_locations_ride_id_idx on public.driver_locations (ride_id);
create index driver_locations_updated_idx on public.driver_locations (updated_at desc);

create or replace function public.set_driver_location_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger driver_locations_set_updated_at
  before update on public.driver_locations
  for each row execute function public.set_driver_location_updated_at();

alter table public.driver_locations enable row level security;

create policy "Drivers can insert own location"
  on public.driver_locations
  for insert
  with check (auth.uid() = driver_id);

create policy "Drivers can update own location"
  on public.driver_locations
  for update
  using (auth.uid() = driver_id)
  with check (auth.uid() = driver_id);

create policy "Riders can see driver location for their active bookings"
  on public.driver_locations
  for select
  using (
    exists (
      select 1
      from public.bookings
      where bookings.driver_id = driver_locations.driver_id
        and bookings.rider_id = auth.uid()
        and bookings.status in ('accepted', 'arriving', 'ongoing', 'in_progress', 'confirmed')
    )
  );

create policy "Admins can see all driver locations"
  on public.driver_locations
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create or replace function public.upsert_driver_location(
  p_driver_id uuid,
  p_ride_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_heading double precision default null,
  p_speed_kmh double precision default null,
  p_accuracy_meters double precision default null,
  p_is_online boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.driver_locations (driver_id, ride_id, lat, lng, heading, speed_kmh, accuracy_meters, is_online)
  values (p_driver_id, p_ride_id, p_lat, p_lng, p_heading, p_speed_kmh, p_accuracy_meters, p_is_online)
  on conflict (driver_id) do update set
    ride_id = excluded.ride_id,
    lat = excluded.lat,
    lng = excluded.lng,
    heading = excluded.heading,
    speed_kmh = excluded.speed_kmh,
    accuracy_meters = excluded.accuracy_meters,
    is_online = excluded.is_online,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.get_nearby_drivers(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 5,
  p_limit int default 20
)
returns table (
  driver_id uuid,
  lat double precision,
  lng double precision,
  heading double precision,
  speed_kmh double precision,
  distance_km double precision,
  updated_at timestamptz,
  full_name text,
  avatar_url text,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  vehicle_plate text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    dl.driver_id,
    dl.lat,
    dl.lng,
    dl.heading,
    dl.speed_kmh,
    round(
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(dl.lat)) * cos(radians(dl.lng) - radians(p_lng))
        + sin(radians(p_lat)) * sin(radians(dl.lat))
      )::numeric, 3
    ) as distance_km,
    dl.updated_at,
    p.full_name,
    p.avatar_url,
    v.make as vehicle_make,
    v.model as vehicle_model,
    v.color as vehicle_color,
    v.license_plate as vehicle_plate
  from public.driver_locations dl
  join public.profiles p on p.id = dl.driver_id
  left join public.vehicles v on v.driver_id = dl.driver_id
  where dl.is_online = true
    and dl.updated_at > now() - interval '2 minutes'
    and 6371 * acos(
      cos(radians(p_lat)) * cos(radians(dl.lat)) * cos(radians(dl.lng) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(dl.lat))
    ) <= p_radius_km
  order by dl.updated_at desc
  limit p_limit;
end;
$$;