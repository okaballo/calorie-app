-- =============================================================================
-- KiBase  |  Supabase schema for Cloud Sync
-- Run the whole file in the Supabase dashboard: SQL Editor > New query > Run.
-- It is safe to run again (every statement is idempotent).
--
-- Security model
--   * Row Level Security is ON (and FORCED) on every table.
--   * One policy per operation (SELECT / INSERT / UPDATE / DELETE), each allowing
--     only rows whose user_id equals the caller's auth.uid().
--   * Signed-out visitors (the `anon` role) get no privileges at all.
--   * user_id defaults to auth.uid() and must match it; a row can never be moved
--     to another user (UPDATE checks the new value too).
--   * updated_at is set by the server (trigger), never by the client: devices with
--     a wrong clock cannot hide or overwrite changes.
--   * Size and shape limits (CHECK) on every user-written column.
--   * Deleting a user in Authentication deletes all of their rows (ON DELETE CASCADE).
--
-- Sync model (see src/lib/sync/syncEngine.js)
--   * Rows are upserted by (user_id, id); deletes are "tombstones" (deleted_at),
--     so every device learns about them. Devices pull rows with updated_at > their cursor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- updated_at: always the server's clock
-- ---------------------------------------------------------------------------
create or replace function public.kb_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per user. Small per-user documents (the body stats and
-- goals, settings, the user's own foods / saved meals / routines, cheat days,
-- the tracking day in progress and the workout in progress).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id        uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  profile        jsonb check (profile is null or (jsonb_typeof(profile) = 'object' and pg_column_size(profile) <= 16384)),
  avatar         text  check (avatar is null or (char_length(avatar) <= 400000 and avatar like 'data:image/%')),
  theme          text  check (theme is null or char_length(theme) <= 32),
  lang           text  check (lang is null or lang in ('en', 'ar')),
  gym_equipment  jsonb check (gym_equipment is null or (jsonb_typeof(gym_equipment) = 'array' and pg_column_size(gym_equipment) <= 4096)),
  volume_routine text  check (volume_routine is null or char_length(volume_routine) <= 64),
  custom_foods   jsonb check (custom_foods is null or (jsonb_typeof(custom_foods) = 'array' and pg_column_size(custom_foods) <= 1048576)),
  saved_meals    jsonb check (saved_meals is null or (jsonb_typeof(saved_meals) = 'array' and pg_column_size(saved_meals) <= 1048576)),
  routines       jsonb check (routines is null or (jsonb_typeof(routines) = 'array' and pg_column_size(routines) <= 524288)),
  custom_exercises jsonb check (custom_exercises is null or (jsonb_typeof(custom_exercises) = 'array' and pg_column_size(custom_exercises) <= 262144)),
  cheat_days     jsonb check (cheat_days is null or (jsonb_typeof(cheat_days) = 'array' and pg_column_size(cheat_days) <= 65536)),
  active_day     jsonb check (active_day is null or (jsonb_typeof(active_day) = 'object' and pg_column_size(active_day) <= 1024)),
  live_workouts  jsonb check (live_workouts is null or (jsonb_typeof(live_workouts) = 'object' and pg_column_size(live_workouts) <= 262144)),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Added after the first release: run this on a database created before it.
alter table public.profiles add column if not exists custom_exercises jsonb
  check (custom_exercises is null or (jsonb_typeof(custom_exercises) = 'array' and pg_column_size(custom_exercises) <= 262144));

-- ---------------------------------------------------------------------------
-- meals_log: one row per logged meal (its foods with per-100 g values + grams)
-- ---------------------------------------------------------------------------
create table if not exists public.meals_log (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null check (char_length(id) between 1 and 64),
  day        date,                                   -- tracking day the meal counts towards
  eaten_at   timestamptz,
  name       text not null default '' check (char_length(name) <= 300),
  items      jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and pg_column_size(items) <= 65536),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,                            -- tombstone: deleted on some device
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------------
-- weight_log: one row per weigh-in
-- ---------------------------------------------------------------------------
create table if not exists public.weight_log (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null check (char_length(id) between 1 and 64),
  date       date,
  kg         numeric(6, 2) check (kg is null or (kg > 0 and kg < 1000)),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------------
-- workouts_log: one row per finished workout (exercises and sets as JSON)
-- ---------------------------------------------------------------------------
create table if not exists public.workouts_log (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id          text not null check (char_length(id) between 1 and 64),
  day         date,
  name        text not null default '' check (char_length(name) <= 200),
  routine_id  text check (routine_id is null or char_length(routine_id) <= 64),
  started_at  timestamptz,
  finished_at timestamptz,
  exercises   jsonb not null default '[]'::jsonb check (jsonb_typeof(exercises) = 'array' and pg_column_size(exercises) <= 262144),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  primary key (user_id, id)
);

-- Incremental pulls: "my rows changed since <cursor>"
create index if not exists meals_log_user_updated    on public.meals_log    (user_id, updated_at);
create index if not exists weight_log_user_updated   on public.weight_log   (user_id, updated_at);
create index if not exists workouts_log_user_updated on public.workouts_log (user_id, updated_at);

-- Server-side updated_at on every write
drop trigger if exists kb_touch on public.profiles;
create trigger kb_touch before insert or update on public.profiles
  for each row execute function public.kb_touch_updated_at();
drop trigger if exists kb_touch on public.meals_log;
create trigger kb_touch before insert or update on public.meals_log
  for each row execute function public.kb_touch_updated_at();
drop trigger if exists kb_touch on public.weight_log;
create trigger kb_touch before insert or update on public.weight_log
  for each row execute function public.kb_touch_updated_at();
drop trigger if exists kb_touch on public.workouts_log;
create trigger kb_touch before insert or update on public.workouts_log
  for each row execute function public.kb_touch_updated_at();

-- =============================================================================
-- Row Level Security
-- (select auth.uid()) is evaluated once per query instead of once per row.
-- =============================================================================

-- ---- profiles ----
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "profiles: delete own" on public.profiles;
create policy "profiles: delete own" on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---- meals_log ----
alter table public.meals_log enable row level security;
alter table public.meals_log force row level security;

drop policy if exists "meals_log: select own" on public.meals_log;
create policy "meals_log: select own" on public.meals_log
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "meals_log: insert own" on public.meals_log;
create policy "meals_log: insert own" on public.meals_log
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "meals_log: update own" on public.meals_log;
create policy "meals_log: update own" on public.meals_log
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "meals_log: delete own" on public.meals_log;
create policy "meals_log: delete own" on public.meals_log
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---- weight_log ----
alter table public.weight_log enable row level security;
alter table public.weight_log force row level security;

drop policy if exists "weight_log: select own" on public.weight_log;
create policy "weight_log: select own" on public.weight_log
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "weight_log: insert own" on public.weight_log;
create policy "weight_log: insert own" on public.weight_log
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "weight_log: update own" on public.weight_log;
create policy "weight_log: update own" on public.weight_log
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "weight_log: delete own" on public.weight_log;
create policy "weight_log: delete own" on public.weight_log
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---- workouts_log ----
alter table public.workouts_log enable row level security;
alter table public.workouts_log force row level security;

drop policy if exists "workouts_log: select own" on public.workouts_log;
create policy "workouts_log: select own" on public.workouts_log
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "workouts_log: insert own" on public.workouts_log;
create policy "workouts_log: insert own" on public.workouts_log
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "workouts_log: update own" on public.workouts_log;
create policy "workouts_log: update own" on public.workouts_log
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "workouts_log: delete own" on public.workouts_log;
create policy "workouts_log: delete own" on public.workouts_log
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- =============================================================================
-- Privileges: nothing for signed-out visitors; signed-in users get exactly the
-- four operations (and RLS above limits them to their own rows).
-- =============================================================================
revoke all on public.profiles, public.meals_log, public.weight_log, public.workouts_log from anon, public;
revoke all on public.profiles, public.meals_log, public.weight_log, public.workouts_log from authenticated;
grant select, insert, update, delete on public.profiles, public.meals_log, public.weight_log, public.workouts_log to authenticated;
revoke all on function public.kb_touch_updated_at() from anon, authenticated, public;

-- =============================================================================
-- Check (optional): should list 16 policies, 4 per table, all for "authenticated".
--   select tablename, policyname, cmd, roles from pg_policies
--   where schemaname = 'public' and tablename in ('profiles','meals_log','weight_log','workouts_log')
--   order by tablename, cmd;
-- =============================================================================
