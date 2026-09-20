create extension if not exists "pgcrypto";

create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  stripe_payment_intent_id text not null unique,
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'inr',
  status text not null default 'created' check (status in ('created', 'processing', 'succeeded', 'failed', 'canceled', 'refunded')),
  payment_method_id text,
  payment_method_type text,
  metadata jsonb not null default '{}',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  succeeded_at timestamptz,
  refunded_at timestamptz
);

create index payment_intents_user_idx on public.payment_intents (user_id, created_at desc);
create index payment_intents_booking_idx on public.payment_intents (booking_id);
create index payment_intents_stripe_idx on public.payment_intents (stripe_payment_intent_id);

create or replace function public.set_payment_intent_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger payment_intents_set_updated_at
  before update on public.payment_intents
  for each row execute function public.set_payment_intent_updated_at();

alter table public.payment_intents enable row level security;

create policy "Users can read own payment intents"
  on public.payment_intents
  for select
  using (auth.uid() = user_id);

create policy "Users can create payment intents"
  on public.payment_intents
  for insert
  with check (auth.uid() = user_id);

create policy "Admins can see all payment intents"
  on public.payment_intents
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create or replace function public.create_payment_intent(
  p_user_id uuid,
  p_booking_id uuid,
  p_amount_cents int,
  p_currency text default 'inr',
  p_metadata jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent_id uuid;
begin
  insert into public.payment_intents (user_id, booking_id, stripe_payment_intent_id, amount_cents, currency, metadata, status)
  values (p_user_id, p_booking_id, 'pi_pending_' || gen_random_uuid()::text, p_amount_cents, p_currency, p_metadata, 'created')
  returning id into v_intent_id;

  return v_intent_id;
end;
$$;

create or replace function public.update_payment_intent_status(
  p_stripe_intent_id text,
  p_status text,
  p_payment_method_id text default null,
  p_payment_method_type text default null,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payment_intents
  set
    status = p_status,
    payment_method_id = p_payment_method_id,
    payment_method_type = p_payment_method_type,
    error_message = p_error_message,
    succeeded_at = case when p_status = 'succeeded' then now() else succeeded_at end,
    refunded_at = case when p_status = 'refunded' then now() else refunded_at end,
    updated_at = now()
  where stripe_payment_intent_id = p_stripe_intent_id;
end;
$$;

create or replace function public.link_stripe_payment_intent(
  p_local_id uuid,
  p_stripe_intent_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payment_intents
  set stripe_payment_intent_id = p_stripe_intent_id,
      status = 'processing',
      updated_at = now()
  where id = p_local_id;
end;
$$;