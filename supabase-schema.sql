-- Life RPG — Supabase schema (Step 1)
-- Run this once in: Supabase Dashboard → SQL Editor → New query → Run
-- Does not change your local HTML/JS app yet.

-- Profiles: one row per logged-in user (avatar + skills + wheel scores)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  look text not null default '🙂',
  level int not null default 1,
  xp int not null default 0,
  skills jsonb not null default '{}'::jsonb,
  wheel jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- If profiles already exists without wheel, run this once:
-- alter table public.profiles
--   add column if not exists wheel jsonb not null default '{}'::jsonb;

-- Quest paths: each user's custom paths (steps stored as JSON)
create table if not exists public.quest_paths (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  title text not null,
  description text not null default '',
  reward text not null default '',
  reward_claimed boolean not null default false,
  steps jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Step completions: replaces lifeRpgQuestDone keys "pathId::stepId"
create table if not exists public.step_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  path_id text not null,
  step_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, path_id, step_id)
);

-- Row Level Security: each user only sees/edits their own rows
alter table public.profiles enable row level security;
alter table public.quest_paths enable row level security;
alter table public.step_completions enable row level security;

-- Profiles policies
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

-- Quest paths policies
create policy "quest_paths_select_own"
  on public.quest_paths for select
  using (auth.uid() = user_id);

create policy "quest_paths_insert_own"
  on public.quest_paths for insert
  with check (auth.uid() = user_id);

create policy "quest_paths_update_own"
  on public.quest_paths for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "quest_paths_delete_own"
  on public.quest_paths for delete
  using (auth.uid() = user_id);

-- Step completions policies
create policy "step_completions_select_own"
  on public.step_completions for select
  using (auth.uid() = user_id);

create policy "step_completions_insert_own"
  on public.step_completions for insert
  with check (auth.uid() = user_id);

create policy "step_completions_update_own"
  on public.step_completions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "step_completions_delete_own"
  on public.step_completions for delete
  using (auth.uid() = user_id);
