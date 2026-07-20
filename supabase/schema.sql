-- Canuto MVP schema + RLS
-- Run in Supabase SQL editor

create extension if not exists "pgcrypto";

create type public.user_role as enum ('user', 'admin');
create type public.event_type as enum (
  'musica',
  'teatro',
  'cine',
  'fiesta',
  'deporte',
  'gastronomico',
  'feria',
  'exposicion',
  'infantil',
  'otro'
);
create type public.cost_type as enum ('gratis', 'a_la_gorra', 'pago');
create type public.visibility as enum ('public', 'private');
create type public.event_status as enum ('pending', 'approved', 'rejected');
create type public.event_source as enum ('organizer', 'scrape');
create type public.code_kind as enum ('one_time', 'group', 'permanent');
create type public.rsvp_status as enum ('going', 'maybe', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type public.event_type not null default 'otro',
  starts_at timestamptz not null,
  ends_at timestamptz,
  lat double precision,
  lng double precision,
  address text,
  cost_type public.cost_type not null default 'gratis',
  price numeric(12, 2),
  visibility public.visibility not null default 'public',
  status public.event_status not null default 'pending',
  source public.event_source not null default 'organizer',
  source_url text unique,
  source_name text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_public_feed_idx
  on public.events (starts_at)
  where visibility = 'public' and status = 'approved';

create index events_geo_idx on public.events (lat, lng);

create table public.event_access_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  code text not null,
  kind public.code_kind not null default 'permanent',
  max_uses int,
  uses_count int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, code)
);

create table public.event_unlocks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table public.rsvps (
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  status public.rsvp_status not null default 'going',
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  ok boolean not null default true,
  message text,
  fetched_count int not null default 0,
  upserted_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.can_view_event(e public.events)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (e.visibility = 'public' and e.status = 'approved')
    or e.created_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.event_unlocks u
      where u.event_id = e.id and u.user_id = auth.uid()
    );
$$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_access_codes enable row level security;
alter table public.event_unlocks enable row level security;
alter table public.rsvps enable row level security;
alter table public.scrape_runs enable row level security;

-- Profiles
create policy "Profiles are readable by authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Events
create policy "Public approved events are readable"
  on public.events for select
  using (public.can_view_event(events));

create policy "Authenticated can create events"
  on public.events for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Owners update own events"
  on public.events for update
  to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

create policy "Admins delete events"
  on public.events for delete
  to authenticated
  using (public.is_admin());

-- Access codes: owner/admin manage; unlock via RPC
create policy "Owners manage codes"
  on public.event_access_codes for all
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and (e.created_by = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and (e.created_by = auth.uid() or public.is_admin())
    )
  );

-- Unlocks
create policy "Users read own unlocks"
  on public.event_unlocks for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Users insert own unlocks via redeem"
  on public.event_unlocks for insert
  to authenticated
  with check (user_id = auth.uid());

-- RSVPs
create policy "Users manage own rsvps"
  on public.rsvps for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Event owners see rsvps"
  on public.rsvps for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and (e.created_by = auth.uid() or public.is_admin())
    )
  );

-- Scrape runs: admin only
create policy "Admins read scrape runs"
  on public.scrape_runs for select
  to authenticated
  using (public.is_admin());

create policy "Service role inserts scrape runs"
  on public.scrape_runs for insert
  to authenticated
  with check (public.is_admin());

-- Redeem private code
create or replace function public.redeem_event_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.event_access_codes%rowtype;
  v_event public.events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated';
  end if;

  select * into v_code
  from public.event_access_codes
  where upper(code) = upper(trim(p_code))
  limit 1;

  if not found then
    raise exception 'Invalid code';
  end if;

  if v_code.expires_at is not null and v_code.expires_at < now() then
    raise exception 'Code expired';
  end if;

  if v_code.kind = 'one_time' and v_code.uses_count >= 1 then
    raise exception 'Code already used';
  end if;

  if v_code.kind = 'group' and v_code.max_uses is not null and v_code.uses_count >= v_code.max_uses then
    raise exception 'Code usage limit reached';
  end if;

  select * into v_event from public.events where id = v_code.event_id;
  if not found or v_event.visibility <> 'private' then
    raise exception 'Event not available';
  end if;

  insert into public.event_unlocks (user_id, event_id)
  values (auth.uid(), v_code.event_id)
  on conflict do nothing;

  update public.event_access_codes
  set uses_count = uses_count + 1
  where id = v_code.id;

  return v_code.event_id;
end;
$$;

grant execute on function public.redeem_event_code(text) to authenticated;
