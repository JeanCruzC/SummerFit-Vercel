-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gender text check (gender in ('M', 'F')),
  age int,
  height_cm numeric,
  weight_kg numeric,
  target_weight_kg numeric,
  goal text check (goal in ('Definir', 'Mantener', 'Volumen')),
  activity_level text check (activity_level in ('Sedentario', 'Ligero', 'Moderado', 'Activo', 'Muy activo')),
  diet_type text default 'Estándar',
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- DAILY LOGS
-- ============================================================
create table if not exists public.daily_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  log_date date not null,
  weight_kg numeric,
  calories_consumed int default 0,
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  exercise_minutes int default 0,
  calories_burned int default 0,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);

-- ============================================================
-- MEAL ENTRIES
-- ============================================================
create table if not exists public.meal_entries (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  log_date date not null,
  meal_type text check (meal_type in ('Desayuno', 'Almuerzo', 'Cena', 'Snack')),
  food_name text not null,
  grams numeric not null,
  calories int,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  created_at timestamptz default now()
);

-- ============================================================
-- FOODS CATALOG
-- ============================================================
create table if not exists public.foods (
  id bigint generated always as identity primary key,
  source_id text unique,
  name text not null,
  category text,
  kcal_per_100g numeric,
  protein_g_per_100g numeric,
  carbs_g_per_100g numeric,
  fat_g_per_100g numeric,
  created_at timestamptz default now()
);

-- ============================================================
-- EXERCISE LOGS
-- ============================================================
create table if not exists public.exercise_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  log_date date not null,
  exercise_type text not null,
  duration_minutes int not null,
  intensity text check (intensity in ('Baja', 'Media', 'Alta')),
  calories_burned int,
  created_at timestamptz default now()
);

-- ============================================================
-- WEIGHT HISTORY
-- ============================================================
create table if not exists public.weight_history (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  recorded_at date not null,
  weight_kg numeric not null,
  created_at timestamptz default now(),
  unique (user_id, recorded_at)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_daily_logs_user_date on public.daily_logs(user_id, log_date desc);
create index if not exists idx_meal_entries_user_date on public.meal_entries(user_id, log_date);
create index if not exists idx_exercise_logs_user_date on public.exercise_logs(user_id, log_date);
create index if not exists idx_weight_history_user on public.weight_history(user_id, recorded_at desc);
create index if not exists foods_source_idx on public.foods(source_id);
create index if not exists idx_foods_name on public.foods using gin(to_tsvector('spanish', name));

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.daily_logs enable row level security;
alter table public.meal_entries enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.weight_history enable row level security;
alter table public.foods enable row level security;

-- Drop existing policies (to avoid conflicts)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can manage own daily logs" on public.daily_logs;
drop policy if exists "Users can manage own meal entries" on public.meal_entries;
drop policy if exists "Users can manage own exercise logs" on public.exercise_logs;
drop policy if exists "Users can manage own weight history" on public.weight_history;
drop policy if exists "Foods are publicly readable" on public.foods;

-- Profiles: users can only access their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Daily logs: users can only access their own logs
create policy "Users can manage own daily logs"
  on public.daily_logs for all
  using (auth.uid() = user_id);

-- Meal entries: users can only access their own entries
create policy "Users can manage own meal entries"
  on public.meal_entries for all
  using (auth.uid() = user_id);

-- Exercise logs: users can only access their own logs
create policy "Users can manage own exercise logs"
  on public.exercise_logs for all
  using (auth.uid() = user_id);

-- Weight history: users can only access their own history
create policy "Users can manage own weight history"
  on public.weight_history for all
  using (auth.uid() = user_id);

-- Foods: everyone can read, nobody can modify (admin only)
create policy "Foods are publicly readable"
  on public.foods for select
  using (true);
