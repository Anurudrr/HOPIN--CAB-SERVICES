create extension if not exists "pgcrypto";

create table public.phone_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  phone text not null,
  code text not null,
  purpose text not null check (purpose in ('verify', 'login', '2fa', 'password_reset')),
  attempts int not null default 0,
  max_attempts int not null default 3,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index phone_verification_codes_user_idx on public.phone_verification_codes (user_id, created_at desc);
create index phone_verification_codes_phone_idx on public.phone_verification_codes (phone, purpose, expires_at) where verified_at is null;

alter table public.phone_verification_codes enable row level security;

create policy "Users can read own verification codes"
  on public.phone_verification_codes
  for select
  using (auth.uid() = user_id);

create policy "Admins can see all verification codes"
  on public.phone_verification_codes
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create table public.user_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  relationship text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_emergency_contacts_user_idx on public.user_emergency_contacts (user_id);

create or replace function public.set_emergency_contact_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger emergency_contacts_set_updated_at
  before update on public.user_emergency_contacts
  for each row execute function public.set_emergency_contact_updated_at();

alter table public.user_emergency_contacts enable row level security;

create policy "Users can manage own emergency contacts"
  on public.user_emergency_contacts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.sos_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  lat double precision not null,
  lng double precision not null,
  address text,
  status text not null default 'active' check (status in ('active', 'responded', 'resolved', 'cancelled')),
  responders jsonb not null default '[]',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index sos_alerts_user_idx on public.sos_alerts (user_id, created_at desc);
create index sos_alerts_status_idx on public.sos_alerts (status) where status = 'active';

alter table public.sos_alerts enable row level security;

create policy "Users can read own SOS alerts"
  on public.sos_alerts
  for select
  using (auth.uid() = user_id);

create policy "Users can create SOS alerts"
  on public.sos_alerts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own SOS alerts"
  on public.sos_alerts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can see all SOS alerts"
  on public.sos_alerts
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create or replace function public.send_phone_verification(
  p_user_id uuid,
  p_phone text,
  p_purpose text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_expires timestamptz;
begin
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  v_expires := now() + interval '10 minutes';

  insert into public.phone_verification_codes (user_id, phone, code, purpose, expires_at)
  values (p_user_id, p_phone, v_code, p_purpose, v_expires);

  return v_code;
end;
$$;

create or replace function public.verify_phone_code(
  p_user_id uuid,
  p_phone text,
  p_code text,
  p_purpose text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record record;
begin
  select * into v_record
  from public.phone_verification_codes
  where user_id = p_user_id
    and phone = p_phone
    and code = p_code
    and purpose = p_purpose
    and verified_at is null
    and expires_at > now()
    and attempts < max_attempts
  order by created_at desc
  limit 1;

  if not found then
    update public.phone_verification_codes
    set attempts = attempts + 1
    where user_id = p_user_id
      and phone = p_phone
      and purpose = p_purpose
      and verified_at is null
      and expires_at > now();
    return false;
  end if;

  update public.phone_verification_codes
  set verified_at = now()
  where id = v_record.id;

  return true;
end;
$$;

create or replace function public.cleanup_expired_phone_codes()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  delete from public.phone_verification_codes
  where expires_at < now() - interval '1 hour';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;