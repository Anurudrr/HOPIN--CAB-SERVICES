create extension if not exists "pgcrypto";

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  subject text not null,
  html_content text not null,
  text_content text,
  variables jsonb not null default '[]',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_email_template_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger email_templates_set_updated_at
  before update on public.email_templates
  for each row execute function public.set_email_template_updated_at();

insert into public.email_templates (key, subject, html_content, text_content, variables) values
  ('welcome', 'Welcome to HopIn!', 
   '<h1>Welcome to HopIn, {{name}}!</h1><p>Thanks for joining. Start booking rides in {{city}}.</p>',
   'Welcome to HopIn, {{name}}! Thanks for joining. Start booking rides in {{city}}.',
   '["name", "city"]'),
  
  ('booking_confirmed', 'Booking Confirmed - {{booking_code}}',
   '<h1>Booking Confirmed</h1><p>Your ride from {{pickup}} to {{destination}} is confirmed for {{departure_time}}.</p><p>Booking code: <strong>{{booking_code}}</strong></p>',
   'Booking Confirmed. Your ride from {{pickup}} to {{destination}} is confirmed for {{departure_time}}. Booking code: {{booking_code}}',
   '["booking_code", "pickup", "destination", "departure_time"]'),
  
  ('booking_reminder', 'Reminder: Your ride in 30 minutes',
   '<h1>Ride Reminder</h1><p>Your ride from {{pickup}} to {{destination}} departs in 30 minutes ({{departure_time}}).</p>',
   'Ride Reminder: Your ride from {{pickup}} to {{destination}} departs in 30 minutes ({{departure_time}}).',
   '["pickup", "destination", "departure_time"]'),
  
  ('driver_assigned', 'Driver Assigned - {{driver_name}}',
   '<h1>Driver Assigned</h1><p>{{driver_name}} will pick you up in a {{vehicle_color}} {{vehicle_make}} {{vehicle_model}} ({{vehicle_plate}}).</p>',
   'Driver Assigned: {{driver_name}} will pick you up in a {{vehicle_color}} {{vehicle_make}} {{vehicle_model}} ({{vehicle_plate}}).',
   '["driver_name", "vehicle_color", "vehicle_make", "vehicle_model", "vehicle_plate"]'),
  
  ('ride_completed', 'Ride Completed - Receipt attached',
   '<h1>Ride Completed</h1><p>Thanks for riding with HopIn! Your receipt for {{amount}} is attached.</p>',
   'Ride Completed. Thanks for riding with HopIn! Your receipt for {{amount}} is attached.',
   '["amount"]'),
  
  ('payment_receipt', 'Your HopIn Receipt - {{booking_code}}',
   '<h1>Payment Receipt</h1><p>Booking: {{booking_code}}</p><p>Amount: {{amount}}</p><p>Date: {{date}}</p>',
   'Payment Receipt. Booking: {{booking_code}}. Amount: {{amount}}. Date: {{date}}.',
   '["booking_code", "amount", "date"]'),
  
  ('password_reset', 'Reset your HopIn password',
   '<h1>Password Reset</h1><p>Click <a href="{{reset_link}}">here</a> to reset your password. Link expires in 1 hour.</p>',
   'Password Reset. Click {{reset_link}} to reset your password. Link expires in 1 hour.',
   '["reset_link"]'),
  
  ('phone_verify', 'Verify your phone number',
   '<h1>Phone Verification</h1><p>Your verification code is: <strong>{{code}}</strong>. Valid for 10 minutes.</p>',
   'Phone Verification. Your verification code is: {{code}}. Valid for 10 minutes.',
   '["code"]'),
  
  ('promo_code', 'You have a new promo code!',
   '<h1>New Promo Code</h1><p>Use code <strong>{{code}}</strong> for {{discount}}% off your next {{max_rides}} rides.</p>',
   'New Promo Code. Use code {{code}} for {{discount}}% off your next {{max_rides}} rides.',
   '["code", "discount", "max_rides"]'),
  
  ('referral_reward', 'You earned a referral reward!',
   '<h1>Referral Reward</h1><p>{{referred_name}} signed up using your code. You earned {{reward}} credits!</p>',
   'Referral Reward. {{referred_name}} signed up using your code. You earned {{reward}} credits!',
   '["referred_name", "reward"]');

create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  template_key text not null,
  to_email text not null,
  subject text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'bounced')),
  provider text,
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index email_logs_user_idx on public.email_logs (user_id, created_at desc);
create index email_logs_template_idx on public.email_logs (template_key);
create index email_logs_status_idx on public.email_logs (status);

alter table public.email_logs enable row level security;

create policy "Users can read own email logs"
  on public.email_logs
  for select
  using (auth.uid() = user_id);

create policy "Admins can see all email logs"
  on public.email_logs
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create or replace function public.log_email(
  p_user_id uuid,
  p_template_key text,
  p_to_email text,
  p_subject text,
  p_status text,
  p_provider text,
  p_provider_message_id text default null,
  p_error_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.email_logs (user_id, template_key, to_email, subject, status, provider, provider_message_id, error_message, sent_at)
  values (p_user_id, p_template_key, p_to_email, p_subject, p_status, p_provider, p_provider_message_id, p_error_message, case when p_status = 'sent' then now() else null end)
  returning id into v_id;
  return v_id;
end;
$$;