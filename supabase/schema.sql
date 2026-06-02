-- Fletcher's Bar Builder — Supabase setup.
-- Run ONCE in your Supabase project: Dashboard → SQL Editor → paste → Run.
--
-- Live collaboration uses Supabase Realtime "broadcast", which needs NO table
-- and NO extra config. This table only stores a durable per-room snapshot so a
-- visitor who opens the link while nobody else is online still sees the latest
-- saved layout (send-and-forget for emailing the link).

create table if not exists public.bar_rooms (
  id          text primary key,
  state       text,                       -- base64 Yjs document snapshot
  updated_at  timestamptz not null default now()
);

alter table public.bar_rooms enable row level security;

-- This is a private internal tool guarded by hard-to-guess room ids. Allow the
-- anon (client) key to read/write room snapshots. Tighten later if needed.
drop policy if exists "bar_rooms anon read"  on public.bar_rooms;
drop policy if exists "bar_rooms anon write" on public.bar_rooms;

create policy "bar_rooms anon read"
  on public.bar_rooms for select to anon using (true);

create policy "bar_rooms anon write"
  on public.bar_rooms for insert to anon with check (true);

create policy "bar_rooms anon update"
  on public.bar_rooms for update to anon using (true) with check (true);
