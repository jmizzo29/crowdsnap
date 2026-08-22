-- Grouppix schema. Safe to run on an existing CrowdSnap / Groupix project.
-- Groups are private: knowing the slug (the code) is the invite.
-- The app never renders a public directory.

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  event_date text,
  cover_line text,
  created_at timestamptz not null default now()
);

alter table public.groups add column if not exists event_date text;
alter table public.groups add column if not exists cover_line text;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups (id) on delete cascade,
  type text,
  day text,
  title text,
  notes text,
  media jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists memories_group_id_created_at
  on public.memories (group_id, created_at desc);

alter table public.groups enable row level security;
alter table public.memories enable row level security;

drop policy if exists "groups read" on public.groups;
drop policy if exists "groups insert" on public.groups;
drop policy if exists "memories read" on public.memories;
drop policy if exists "memories insert" on public.memories;

-- Anon can read and create. There is still no UI directory.
-- For stricter privacy, revoke SELECT on these tables from anon
-- and set SUPABASE_SERVICE_ROLE_KEY so only /api can look up a code.
create policy "groups read" on public.groups for select using (true);
create policy "groups insert" on public.groups for insert with check (true);
create policy "memories read" on public.memories for select using (true);
create policy "memories insert" on public.memories for insert with check (true);

-- Storage bucket (create in the dashboard if it does not exist): trip-media
-- Public read, anon upload. Paths are namespaced by group slug.
-- Example storage policies (run after the bucket exists):
--
-- create policy "public read trip-media"
--   on storage.objects for select
--   using (bucket_id = 'trip-media');
--
-- create policy "anon upload trip-media"
--   on storage.objects for insert
--   to anon
--   with check (bucket_id = 'trip-media');
