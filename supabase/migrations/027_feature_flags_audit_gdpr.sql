create extension if not exists "pgcrypto";

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  enabled boolean not null default false,
  rollout_percentage int not null default 0 check (rollout_percentage between 0 and 100),
  targeting jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_feature_flag_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger feature_flags_set_updated_at
  before update on public.feature_flags
  for each row execute function public.set_feature_flag_updated_at();

alter table public.feature_flags enable row level security;

create policy "Admins can manage feature flags"
  on public.feature_flags
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Users can read feature flags for evaluation"
  on public.feature_flags
  for select
  using (true);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage, targeting) values
  ('pooling', 'Ride Pooling', 'Enable ride pooling/matching feature', true, 100, '{}'),
  ('chat', 'In-App Chat', 'Enable rider-driver chat', true, 100, '{}'),
  ('push_notifications', 'Push Notifications', 'Enable web push notifications', true, 100, '{}'),
  ('live_tracking', 'Live Driver Tracking', 'Enable real-time driver location', true, 100, '{}'),
  ('scheduled_rides', 'Scheduled Rides', 'Enable scheduled/recurring rides', true, 100, '{}'),
  ('multi_stop', 'Multi-Stop Bookings', 'Enable multiple stops per booking', true, 100, '{}'),
  ('sos', 'SOS Emergency', 'Enable SOS emergency button', true, 100, '{}'),
  ('referrals', 'Referral Program', 'Enable referral codes and rewards', true, 100, '{}'),
  ('promo_codes', 'Promo Codes', 'Enable promotional discount codes', true, 100, '{}'),
  ('phone_verification', 'Phone Verification', 'Enable SMS phone verification', true, 100, '{}'),
  ('email_notifications', 'Email Notifications', 'Enable transactional emails', true, 100, '{}'),
  ('driver_app', 'Driver Mobile App', 'Enable driver app features', false, 0, '{}'),
  ('corporate_accounts', 'Corporate Accounts', 'Enable B2B/corporate features', false, 0, '{}'),
  ('analytics', 'Analytics Tracking', 'Enable Mixpanel/Amplitude tracking', false, 0, '{}');

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb not null default '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_user_idx on public.audit_logs (user_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_resource_idx on public.audit_logs (resource_type, resource_id);
create index audit_logs_action_idx on public.audit_logs (action);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

create policy "Users can read own audit logs"
  on public.audit_logs
  for select
  using (auth.uid() = user_id or auth.uid() = actor_id);

create policy "Admins can see all audit logs"
  on public.audit_logs
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create or replace function public.log_audit(
  p_user_id uuid,
  p_actor_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid default null,
  p_old_values jsonb default null,
  p_new_values jsonb default null,
  p_metadata jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.audit_logs (user_id, actor_id, action, resource_type, resource_id, old_values, new_values, metadata)
  values (p_user_id, p_actor_id, p_action, p_resource_type, p_resource_id, p_old_values, p_new_values, p_metadata)
  returning id into v_id;
  return v_id;
end;
$$;

create table public.gdpr_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('export', 'delete', 'rectification', 'restrict', 'portability')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
  requested_data jsonb,
  completed_data jsonb,
  error_message text,
  processed_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gdpr_requests_user_idx on public.gdpr_requests (user_id, created_at desc);
create index gdpr_requests_status_idx on public.gdpr_requests (status);

create or replace function public.set_gdpr_request_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger gdpr_requests_set_updated_at
  before update on public.gdpr_requests
  for each row execute function public.set_gdpr_request_updated_at();

alter table public.gdpr_requests enable row level security;

create policy "Users can manage own GDPR requests"
  on public.gdpr_requests
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can see all GDPR requests"
  on public.gdpr_requests
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create or replace function public.submit_gdpr_request(
  p_user_id uuid,
  p_request_type text,
  p_requested_data jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  insert into public.gdpr_requests (user_id, request_type, requested_data)
  values (p_user_id, p_request_type, p_requested_data)
  returning id into v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.get_user_data_export(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_profile record;
  v_bookings jsonb;
  v_rides jsonb;
  v_transactions jsonb;
  v_reviews jsonb;
  v_notifications jsonb;
  v_saved_locations jsonb;
  v_emergency_contacts jsonb;
  v_scheduled_rides jsonb;
  v_referrals jsonb;
  v_promo_usages jsonb;
  v_chat_messages jsonb;
  v_sos_alerts jsonb;
  v_audit_logs jsonb;
begin
  select * into v_profile from public.profiles where id = p_user_id;
  
  select jsonb_agg(to_jsonb(b)) into v_bookings from public.bookings b where b.rider_id = p_user_id;
  select jsonb_agg(to_jsonb(r)) into v_rides from public.rides r where r.driver_id = p_user_id;
  select jsonb_agg(to_jsonb(t)) into v_transactions from public.transactions t where t.user_id = p_user_id;
  select jsonb_agg(to_jsonb(r)) into v_reviews from public.reviews r where r.reviewer_id = p_user_id;
  select jsonb_agg(to_jsonb(n)) into v_notifications from public.notifications n where n.receiver_id = p_user_id;
  select jsonb_agg(to_jsonb(s)) into v_saved_locations from public.saved_locations s where s.user_id = p_user_id;
  select jsonb_agg(to_jsonb(e)) into v_emergency_contacts from public.user_emergency_contacts e where e.user_id = p_user_id;
  select jsonb_agg(to_jsonb(s)) into v_scheduled_rides from public.scheduled_rides s where s.rider_id = p_user_id;
  select jsonb_agg(to_jsonb(r)) into v_referrals from public.referrals r where r.referrer_id = p_user_id or r.referred_id = p_user_id;
  select jsonb_agg(to_jsonb(p)) into v_promo_usages from public.promo_code_usages p where p.user_id = p_user_id;
  select jsonb_agg(to_jsonb(c)) into v_chat_messages from public.chat_messages c where c.sender_id = p_user_id;
  select jsonb_agg(to_jsonb(s)) into v_sos_alerts from public.sos_alerts s where s.user_id = p_user_id;
  select jsonb_agg(to_jsonb(a)) into v_audit_logs from public.audit_logs a where a.user_id = p_user_id;

  v_result := jsonb_build_object(
    'profile', to_jsonb(v_profile),
    'bookings', coalesce(v_bookings, '[]'),
    'rides', coalesce(v_rides, '[]'),
    'transactions', coalesce(v_transactions, '[]'),
    'reviews', coalesce(v_reviews, '[]'),
    'notifications', coalesce(v_notifications, '[]'),
    'saved_locations', coalesce(v_saved_locations, '[]'),
    'emergency_contacts', coalesce(v_emergency_contacts, '[]'),
    'scheduled_rides', coalesce(v_scheduled_rides, '[]'),
    'referrals', coalesce(v_referrals, '[]'),
    'promo_code_usages', coalesce(v_promo_usages, '[]'),
    'chat_messages', coalesce(v_chat_messages, '[]'),
    'sos_alerts', coalesce(v_sos_alerts, '[]'),
    'audit_logs', coalesce(v_audit_logs, '[]'),
    'exported_at', now()
  );

  return v_result;
end;
$$;