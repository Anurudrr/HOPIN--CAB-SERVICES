create extension if not exists "pgcrypto";

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create or replace function public.set_push_subscription_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_push_subscription_updated_at();

alter table public.push_subscriptions enable row level security;

create policy "Users can manage own push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can see all push subscriptions"
  on public.push_subscriptions
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  body text not null,
  data_schema jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.notification_templates (key, title, body, data_schema) values
  ('booking_confirmed', 'Booking confirmed', 'Your booking {{booking_code}} is confirmed for {{departure_time}}', '{"booking_id": "string", "booking_code": "string", "departure_time": "string"}'),
  ('driver_assigned', 'Driver assigned', '{{driver_name}} is on the way to pick you up', '{"booking_id": "string", "driver_id": "string", "driver_name": "string"}'),
  ('driver_arriving', 'Driver arriving', 'Your driver is {{minutes}} minutes away', '{"booking_id": "string", "driver_lat": "number", "driver_lng": "number", "minutes": "number"}'),
  ('ride_started', 'Ride started', 'Your ride has begun. Safe travels!', '{"booking_id": "string"}'),
  ('ride_completed', 'Ride completed', 'Thanks for riding with HopIn. Your receipt is ready.', '{"booking_id": "string", "receipt_url": "string"}'),
  ('payment_success', 'Payment successful', 'Your payment of {{amount}} has been processed', '{"booking_id": "string", "amount": "string"}'),
  ('payment_failed', 'Payment failed', 'Your payment could not be processed. Please try again.', '{"booking_id": "string", "error": "string"}'),
  ('booking_cancelled', 'Booking cancelled', 'Your booking has been cancelled. {{reason}}', '{"booking_id": "string", "reason": "string"}'),
  ('pool_match_found', 'Pool match found', 'Found a shared ride! {{driver_name}} is on the way', '{"request_id": "string", "booking_id": "string", "driver_name": "string"}'),
  ('pool_search_expired', 'Pool search expired', 'No matches found for your pool search. Try direct booking.', '{"request_id": "string"}');

create or replace function public.send_push_notification(
  p_user_id uuid,
  p_template_key text,
  p_data jsonb default '{}'
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription record;
  v_title text;
  v_body text;
  v_count int := 0;
begin
  select title, body into v_title, v_body
  from public.notification_templates
  where key = p_template_key;

  if not found then
    return 0;
  end;

  v_title := regexp_replace(v_title, '{{\s*(\w+)\s*}}', (match) => {
    const key = match.slice(2, -2).trim();
    return p_data->>key ?? match;
  }, 'g');

  v_body := regexp_replace(v_body, '{{\s*(\w+)\s*}}', (match) => {
    const key = match.slice(2, -2).trim();
    return p_data->>key ?? match;
  }, 'g');

  for v_subscription in
    select endpoint, p256dh, auth from public.push_subscriptions where user_id = p_user_id
  loop
    insert into public.notifications (receiver_id, actor_id, title, body, kind, metadata)
    values (p_user_id, null, v_title, v_body, 'system', jsonb_build_object('push', true, 'template', p_template_key, 'data', p_data))
    on conflict do nothing;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;