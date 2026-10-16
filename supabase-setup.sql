-- Run this entire file in Supabase Dashboard → SQL Editor → New query.
-- Uses Row Level Security so each account can access only its own private data.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Dreamer',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "Profiles visible to authenticated users for friend lookup" on public.profiles;
create policy "Profiles visible to authenticated users for friend lookup" on public.profiles for select to authenticated using (true);
drop policy if exists "Users create own profile" on public.profiles;
create policy "Users create own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sleep_date date not null,
  hours numeric(4,2) not null check (hours >= 0 and hours <= 24),
  quality int not null check (quality between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  unique(user_id, sleep_date)
);
alter table public.sleep_logs enable row level security;
drop policy if exists "Own sleep logs select" on public.sleep_logs;
create policy "Own sleep logs select" on public.sleep_logs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Own sleep logs insert" on public.sleep_logs;
create policy "Own sleep logs insert" on public.sleep_logs for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Own sleep logs update" on public.sleep_logs;
create policy "Own sleep logs update" on public.sleep_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Own sleep logs delete" on public.sleep_logs;
create policy "Own sleep logs delete" on public.sleep_logs for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  tip_id text not null,
  created_at timestamptz not null default now(),
  primary key(user_id, tip_id)
);
alter table public.favorites enable row level security;
drop policy if exists "Own favorites select" on public.favorites;
create policy "Own favorites select" on public.favorites for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Own favorites insert" on public.favorites;
create policy "Own favorites insert" on public.favorites for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Own favorites delete" on public.favorites;
create policy "Own favorites delete" on public.favorites for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  constraint no_self_message check (sender_id <> receiver_id)
);
create index if not exists messages_sender_created on public.messages(sender_id, created_at desc);
create index if not exists messages_receiver_created on public.messages(receiver_id, created_at desc);
alter table public.messages enable row level security;
drop policy if exists "Participants read messages" on public.messages;
create policy "Participants read messages" on public.messages for select to authenticated using (auth.uid() = sender_id or auth.uid() = receiver_id);
drop policy if exists "Sender creates message" on public.messages;
create policy "Sender creates message" on public.messages for insert to authenticated with check (auth.uid() = sender_id and exists(select 1 from auth.users u where u.id = receiver_id));

-- Friend lookup is by email but only returns public display name and ID.
-- Email is never returned to the client by this function.
create or replace function public.find_sleeptrack_user(lookup_email text)
returns table(id uuid, display_name text)
language sql security definer
set search_path = public, auth
stable
as $$
  select p.id, p.display_name
  from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(lookup_email))
  limit 1;
$$;
revoke all on function public.find_sleeptrack_user(text) from public;
grant execute on function public.find_sleeptrack_user(text) to authenticated;

-- Profiles are created client-side after sign-up. For production, consider adding
-- rate limits to friend lookup and message sends, and an email-confirmation policy.
