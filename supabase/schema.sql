-- Grouppix. Paste this into the Supabase SQL editor.
-- Then set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on Vercel and redeploy.
-- Do not invent those values — copy them from the Supabase project settings.
--
-- Tables: groups, memories. Storage bucket: trip-media.
-- One memory row per upload. A group can hold 5000+ photos.
-- Knowing the slug (the group code) is the invite. There is no public directory.

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

create policy "groups read" on public.groups for select using (true);
create policy "groups insert" on public.groups for insert with check (true);
create policy "memories read" on public.memories for select using (true);
create policy "memories insert" on public.memories for insert with check (true);

insert into storage.buckets (id, name, public)
values ('trip-media', 'trip-media', true)
on conflict (id) do update set public = true;

drop policy if exists "public read trip-media" on storage.objects;
drop policy if exists "anon upload trip-media" on storage.objects;

create policy "public read trip-media"
  on storage.objects for select
  using (bucket_id = 'trip-media');

create policy "anon upload trip-media"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'trip-media');
