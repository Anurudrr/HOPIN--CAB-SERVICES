create extension if not exists "pgcrypto";

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  message_type text not null default 'text' check (message_type in ('text', 'image', 'location', 'system')),
  metadata jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index chat_messages_booking_idx on public.chat_messages (booking_id, created_at);
create index chat_messages_sender_idx on public.chat_messages (sender_id);

create or replace function public.set_chat_message_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.chat_messages enable row level security;

create policy "Booking participants can read messages"
  on public.chat_messages
  for select
  using (
    exists (
      select 1 from public.bookings
      where bookings.id = chat_messages.booking_id
        and (bookings.rider_id = auth.uid() or bookings.driver_id = auth.uid())
    )
  );

create policy "Booking participants can send messages"
  on public.chat_messages
  for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.bookings
      where bookings.id = chat_messages.booking_id
        and (bookings.rider_id = auth.uid() or bookings.driver_id = auth.uid())
        and bookings.status in ('accepted', 'arriving', 'ongoing', 'in_progress', 'confirmed')
    )
  );

create policy "Admins can read all chat messages"
  on public.chat_messages
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create or replace function public.get_chat_messages(p_booking_id uuid, p_limit int default 100)
returns table (
  id uuid,
  booking_id uuid,
  sender_id uuid,
  message text,
  message_type text,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz,
  sender_name text,
  sender_avatar text,
  is_own boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    cm.id,
    cm.booking_id,
    cm.sender_id,
    cm.message,
    cm.message_type,
    cm.metadata,
    cm.read_at,
    cm.created_at,
    p.full_name as sender_name,
    p.avatar_url as sender_avatar,
    (cm.sender_id = auth.uid()) as is_own
  from public.chat_messages cm
  join public.profiles p on p.id = cm.sender_id
  where cm.booking_id = p_booking_id
    and (
      exists (
        select 1 from public.bookings
        where bookings.id = p_booking_id
          and (bookings.rider_id = auth.uid() or bookings.driver_id = auth.uid())
      )
      or exists (
        select 1 from public.profiles
        where profiles.id = auth.uid() and profiles.role = 'admin'
      )
    )
  order by cm.created_at desc
  limit p_limit;
end;
$$;

create or replace function public.send_chat_message(
  p_booking_id uuid,
  p_message text,
  p_message_type text default 'text',
  p_metadata jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
  v_other_party_id uuid;
begin
  if not exists (
    select 1 from public.bookings
    where id = p_booking_id
      and (rider_id = auth.uid() or driver_id = auth.uid())
      and status in ('accepted', 'arriving', 'ongoing', 'in_progress', 'confirmed')
  ) then
    raise exception 'Not authorized to send messages for this booking';
  end if;

  insert into public.chat_messages (booking_id, sender_id, message, message_type, metadata)
  values (p_booking_id, auth.uid(), p_message, p_message_type, p_metadata)
  returning id into v_message_id;

  select case when rider_id = auth.uid() then driver_id else rider_id end into v_other_party_id
  from public.bookings where id = p_booking_id;

  if v_other_party_id is not null then
    insert into public.notifications (receiver_id, actor_id, title, body, kind, metadata)
    values (
      v_other_party_id,
      auth.uid(),
      'New message',
      p_message,
      'system',
      jsonb_build_object('booking_id', p_booking_id, 'message_id', v_message_id, 'chat', true)
    )
    on conflict do nothing;
  end if;

  return v_message_id;
end;
$$;

create or replace function public.mark_chat_messages_read(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_messages
  set read_at = now()
  where booking_id = p_booking_id
    and sender_id != auth.uid()
    and read_at is null;
end;
$$;