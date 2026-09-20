create extension if not exists "pgcrypto";

create table public.scheduled_rides (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  city text not null,
  pickup_address text not null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  dest_address text not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  stops jsonb not null default '[]',
  scheduled_for timestamptz not null,
  recurrence text check (recurrence in ('once', 'daily', 'weekdays', 'weekly', 'monthly')),
  recurrence_end timestamptz,
  seats int not null default 1 check (seats > 0),
  special_instructions text,
  status text not null default 'scheduled' check (status in ('scheduled', 'searching', 'matched', 'confirmed', 'active', 'completed', 'cancelled', 'failed')),
  matched_ride_id uuid references public.rides(id) on delete set null,
  matched_booking_id uuid references public.bookings(id) on delete set null,
  estimated_fare numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scheduled_rides_rider_idx on public.scheduled_rides (rider_id, created_at desc);
create index scheduled_rides_scheduled_idx on public.scheduled_rides (scheduled_for, status) where status in ('scheduled', 'searching');
create index scheduled_rides_recurrence_idx on public.scheduled_rides (recurrence, recurrence_end) where recurrence != 'once';

create or replace function public.set_scheduled_ride_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger scheduled_rides_set_updated_at
  before update on public.scheduled_rides
  for each row execute function public.set_scheduled_ride_updated_at();

alter table public.scheduled_rides enable row level security;

create policy "Users can manage own scheduled rides"
  on public.scheduled_rides
  for all
  using (auth.uid() = rider_id)
  with check (auth.uid() = rider_id);

create policy "Admins can see all scheduled rides"
  on public.scheduled_rides
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create table public.booking_stops (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  stop_order int not null check (stop_order > 0),
  address text not null,
  lat double precision not null,
  lng double precision not null,
  stop_type text not null default 'pickup' check (stop_type in ('pickup', 'dropoff', 'waypoint')),
  estimated_arrival timestamptz,
  actual_arrival timestamptz,
  wait_time_minutes int default 0,
  created_at timestamptz not null default now()
);

create index booking_stops_booking_idx on public.booking_stops (booking_id, stop_order);

create or replace function public.set_booking_stop_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.booking_stops enable row level security;

create policy "Booking participants can read stops"
  on public.booking_stops
  for select
  using (
    exists (
      select 1 from public.bookings
      where bookings.id = booking_stops.booking_id
        and (bookings.rider_id = auth.uid() or bookings.driver_id = auth.uid())
    )
  );

create policy "Riders can manage stops on their bookings"
  on public.booking_stops
  for all
  using (
    exists (
      select 1 from public.bookings
      where bookings.id = booking_stops.booking_id
        and bookings.rider_id = auth.uid()
        and bookings.status in ('pending', 'confirmed', 'accepted')
    )
  )
  with check (
    exists (
      select 1 from public.bookings
      where bookings.id = booking_stops.booking_id
        and bookings.rider_id = auth.uid()
        and bookings.status in ('pending', 'confirmed', 'accepted')
    )
  );

create or replace function public.create_scheduled_ride(
  p_rider_id uuid,
  p_service_id uuid,
  p_city text,
  p_pickup_address text,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dest_address text,
  p_dest_lat double precision,
  p_dest_lng double precision,
  p_stops jsonb default '[]',
  p_scheduled_for timestamptz,
  p_recurrence text default 'once',
  p_recurrence_end timestamptz default null,
  p_seats int default 1,
  p_special_instructions text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride_id uuid;
begin
  insert into public.scheduled_rides (
    rider_id, service_id, city,
    pickup_address, pickup_lat, pickup_lng,
    dest_address, dest_lat, dest_lng,
    stops, scheduled_for, recurrence, recurrence_end,
    seats, special_instructions
  ) values (
    p_rider_id, p_service_id, p_city,
    p_pickup_address, p_pickup_lat, p_pickup_lng,
    p_dest_address, p_dest_lat, p_dest_lng,
    p_stops, p_scheduled_for, p_recurrence, p_recurrence_end,
    p_seats, p_special_instructions
  ) returning id into v_ride_id;

  return v_ride_id;
end;
$$;

create or replace function public.process_scheduled_rides()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_ride record;
begin
  for v_ride in
    select * from public.scheduled_rides
    where status = 'scheduled'
      and scheduled_for <= now() + interval '30 minutes'
      and scheduled_for > now() - interval '1 hour'
  loop
    update public.scheduled_rides
    set status = 'searching', updated_at = now()
    where id = v_ride.id;

    insert into public.ride_requests (
      rider_id, city,
      pickup_address, pickup_lat, pickup_lng,
      dest_address, dest_lat, dest_lng,
      service_id, seats_requested,
      preferred_departure, latest_departure,
      max_wait_minutes
    ) values (
      v_ride.rider_id, v_ride.city,
      v_ride.pickup_address, v_ride.pickup_lat, v_ride.pickup_lng,
      v_ride.dest_address, v_ride.dest_lat, v_ride.dest_lng,
      v_ride.service_id, v_ride.seats,
      v_ride.scheduled_for, v_ride.scheduled_for + interval '15 minutes',
      15
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.add_booking_stop(
  p_booking_id uuid,
  p_stop_order int,
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_stop_type text default 'waypoint'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stop_id uuid;
begin
  if not exists (
    select 1 from public.bookings
    where id = p_booking_id
      and rider_id = auth.uid()
      and status in ('pending', 'confirmed', 'accepted')
  ) then
    raise exception 'Cannot add stops to this booking';
  end if;

  insert into public.booking_stops (booking_id, stop_order, address, lat, lng, stop_type)
  values (p_booking_id, p_stop_order, p_address, p_lat, p_lng, p_stop_type)
  returning id into v_stop_id;

  return v_stop_id;
end;
$$;

create or replace function public.reorder_booking_stops(p_booking_id uuid, p_stops jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stop jsonb;
  v_order int := 1;
begin
  if not exists (
    select 1 from public.bookings
    where id = p_booking_id
      and rider_id = auth.uid()
      and status in ('pending', 'confirmed', 'accepted')
  ) then
    raise exception 'Cannot reorder stops on this booking';
  end if;

  delete from public.booking_stops where booking_id = p_booking_id;

  for v_stop in select * from jsonb_array_elements(p_stops)
  loop
    insert into public.booking_stops (booking_id, stop_order, address, lat, lng, stop_type)
    values (
      p_booking_id,
      v_order,
      (v_stop->>'address')::text,
      (v_stop->>'lat')::double precision,
      (v_stop->>'lng')::double precision,
      (v_stop->>'stop_type')::text
    );
    v_order := v_order + 1;
  end loop;
end;
$$;

create or replace function public.get_scheduled_rides_for_rider(p_rider_id uuid)
returns table (
  id uuid,
  service_id uuid,
  city text,
  pickup_address text,
  pickup_lat double precision,
  pickup_lng double precision,
  dest_address text,
  dest_lat double precision,
  dest_lng double precision,
  stops jsonb,
  scheduled_for timestamptz,
  recurrence text,
  recurrence_end timestamptz,
  seats int,
  special_instructions text,
  status text,
  matched_ride_id uuid,
  matched_booking_id uuid,
  estimated_fare numeric,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select * from public.scheduled_rides
  where rider_id = p_rider_id
  order by scheduled_for asc;
end;
$$;

create or replace function public.get_booking_stops(p_booking_id uuid)
returns table (
  id uuid,
  stop_order int,
  address text,
  lat double precision,
  lng double precision,
  stop_type text,
  estimated_arrival timestamptz,
  actual_arrival timestamptz,
  wait_time_minutes int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select id, stop_order, address, lat, lng, stop_type, estimated_arrival, actual_arrival, wait_time_minutes
  from public.booking_stops
  where booking_id = p_booking_id
  order by stop_order;
end;
$$;