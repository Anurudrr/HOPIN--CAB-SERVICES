create extension if not exists "pgcrypto";

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed', 'free_ride')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  max_uses int not null default 1 check (max_uses > 0),
  current_uses int not null default 0,
  max_uses_per_user int not null default 1 check (max_uses_per_user > 0),
  min_booking_amount numeric(10,2),
  applicable_services uuid[] default '{}',
  applicable_cities text[] default '{}',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index promo_codes_code_idx on public.promo_codes (code);
create index promo_codes_active_idx on public.promo_codes (is_active, starts_at, expires_at) where is_active = true;

create or replace function public.set_promo_code_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger promo_codes_set_updated_at
  before update on public.promo_codes
  for each row execute function public.set_promo_code_updated_at();

alter table public.promo_codes enable row level security;

create policy "Admins can manage promo codes"
  on public.promo_codes
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Users can view active promo codes"
  on public.promo_codes
  for select
  using (is_active = true and starts_at <= now() and (expires_at is null or expires_at > now()));

create table public.promo_code_usages (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  discount_applied numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index promo_code_usages_code_idx on public.promo_code_usages (promo_code_id);
create index promo_code_usages_user_idx on public.promo_code_usages (user_id);
create index promo_code_usages_booking_idx on public.promo_code_usages (booking_id);

alter table public.promo_code_usages enable row level security;

create policy "Users can read own promo usages"
  on public.promo_code_usages
  for select
  using (auth.uid() = user_id);

create policy "Admins can see all promo usages"
  on public.promo_code_usages
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  code text not null unique,
  total_referrals int not null default 0,
  total_rewards_earned numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index referral_codes_code_idx on public.referral_codes (code);

create or replace function public.set_referral_code_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger referral_codes_set_updated_at
  before update on public.referral_codes
  for each row execute function public.set_referral_code_updated_at();

alter table public.referral_codes enable row level security;

create policy "Users can read own referral code"
  on public.referral_codes
  for select
  using (auth.uid() = user_id);

create policy "Users can create own referral code"
  on public.referral_codes
  for insert
  with check (auth.uid() = user_id);

create policy "Anyone can read referral codes for validation"
  on public.referral_codes
  for select
  using (is_active = true);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  referral_code_id uuid not null references public.referral_codes(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed', 'rewarded', 'cancelled')),
  reward_amount numeric(10,2) not null default 0,
  referrer_reward numeric(10,2) not null default 0,
  referred_reward numeric(10,2) not null default 0,
  completed_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz not null default now()
);

create index referrals_referrer_idx on public.referrals (referrer_id, created_at desc);
create index referrals_referred_idx on public.referrals (referred_id);
create index referrals_status_idx on public.referrals (status);

alter table public.referrals enable row level security;

create policy "Referrer can read own referrals"
  on public.referrals
  for select
  using (auth.uid() = referrer_id);

create policy "Referred user can read their referral"
  on public.referrals
  for select
  using (auth.uid() = referred_id);

create policy "Admins can see all referrals"
  on public.referrals
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create or replace function public.generate_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_exists boolean := true;
begin
  while v_exists loop
    v_code := upper(substr(md5(random()::text || p_user_id::text || clock_timestamp()::text), 1, 8));
    select exists(select 1 from public.referral_codes where code = v_code) into v_exists;
  end loop;

  insert into public.referral_codes (user_id, code)
  values (p_user_id, v_code)
  on conflict (user_id) do update set code = excluded.code;

  return v_code;
end;
$$;

create or replace function public.apply_referral_code(p_referred_id uuid, p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral_code record;
  v_referral_id uuid;
begin
  select * into v_referral_code
  from public.referral_codes
  where code = p_code
    and is_active = true
    and user_id != p_referred_id;

  if not found then
    raise exception 'Invalid or expired referral code';
  end if;

  if exists (select 1 from public.referrals where referred_id = p_referred_id) then
    raise exception 'User already has a referral';
  end if;

  insert into public.referrals (referrer_id, referred_id, referral_code_id, status)
  values (v_referral_code.user_id, p_referred_id, v_referral_code.id, 'pending')
  returning id into v_referral_id;

  update public.referral_codes
  set total_referrals = total_referrals + 1
  where id = v_referral_code.id;

  return v_referral_id;
end;
$$;

create or replace function public.complete_referral(p_referred_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral record;
  v_referrer_reward numeric := 100.00;
  v_referred_reward numeric := 50.00;
begin
  select * into v_referral
  from public.referrals
  where referred_id = p_referred_id
    and status = 'pending'
  limit 1;

  if not found then
    return;
  end if;

  update public.referrals
  set
    status = 'completed',
    completed_at = now(),
    referrer_reward = v_referrer_reward,
    referred_reward = v_referred_reward
  where id = v_referral.id;

  update public.referral_codes
  set total_rewards_earned = total_rewards_earned + v_referrer_reward
  where id = v_referral.referral_code_id;

  insert into public.transactions (booking_id, user_id, amount, platform_fee, tax_amount, payment_method, status, metadata)
  values (null, v_referral.referrer_id, v_referrer_reward, 0, 0, 'wallet', 'paid', jsonb_build_object('type', 'referral_reward', 'referral_id', v_referral.id));

  insert into public.transactions (booking_id, user_id, amount, platform_fee, tax_amount, payment_method, status, metadata)
  values (null, v_referral.referred_id, v_referred_reward, 0, 0, 'wallet', 'paid', jsonb_build_object('type', 'referral_signup_bonus', 'referral_id', v_referral.id));

  update public.referrals
  set status = 'rewarded', rewarded_at = now()
  where id = v_referral.id;
end;
$$;

create or replace function public.validate_promo_code(
  p_code text,
  p_user_id uuid,
  p_booking_amount numeric,
  p_service_id uuid default null,
  p_city text default null
)
returns table (
  valid boolean,
  promo_code_id uuid,
  discount_type text,
  discount_value numeric,
  discount_amount numeric,
  error_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo record;
  v_user_uses int;
begin
  select * into v_promo
  from public.promo_codes
  where code = p_code
    and is_active = true
    and starts_at <= now()
    and (expires_at is null or expires_at > now());

  if not found then
    return query select false, null, null, null, null, 'Invalid or expired promo code';
  end;

  if v_promo.max_uses > 0 and v_promo.current_uses >= v_promo.max_uses then
    return query select false, v_promo.id, null, null, null, 'Promo code usage limit reached';
  end;

  select count(*) into v_user_uses
  from public.promo_code_usages
  where promo_code_id = v_promo.id and user_id = p_user_id;

  if v_user_uses >= v_promo.max_uses_per_user then
    return query select false, v_promo.id, null, null, null, 'You have already used this promo code';
  end;

  if v_promo.min_booking_amount is not null and p_booking_amount < v_promo.min_booking_amount then
    return query select false, v_promo.id, null, null, null, 'Minimum booking amount not met';
  end;

  if v_promo.applicable_services is not null and array_length(v_promo.applicable_services, 1) > 0 and p_service_id is not null then
    if not (p_service_id = any(v_promo.applicable_services)) then
      return query select false, v_promo.id, null, null, null, 'Promo code not valid for this service';
    end if;
  end;

  if v_promo.applicable_cities is not null and array_length(v_promo.applicable_cities, 1) > 0 and p_city is not null then
    if not (p_city = any(v_promo.applicable_cities)) then
      return query select false, v_promo.id, null, null, null, 'Promo code not valid in this city';
    end if;
  end;

  declare
    v_discount numeric := 0;
  begin
    if v_promo.discount_type = 'percentage' then
      v_discount := round(p_booking_amount * v_promo.discount_value / 100, 2);
    elsif v_promo.discount_type = 'fixed' then
      v_discount := least(v_promo.discount_value, p_booking_amount);
    elsif v_promo.discount_type = 'free_ride' then
      v_discount := p_booking_amount;
    end if;

    return query select true, v_promo.id, v_promo.discount_type, v_promo.discount_value, v_discount, null;
  end;
end;
$$;

create or replace function public.use_promo_code(
  p_promo_code_id uuid,
  p_user_id uuid,
  p_booking_id uuid,
  p_discount_applied numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.promo_code_usages (promo_code_id, user_id, booking_id, discount_applied)
  values (p_promo_code_id, p_user_id, p_booking_id, p_discount_applied);

  update public.promo_codes
  set current_uses = current_uses + 1
  where id = p_promo_code_id;
end;
$$;