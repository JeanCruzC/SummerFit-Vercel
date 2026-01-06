-- SummerFit premium schema
create extension if not exists "uuid-ossp";

-- Usuarios
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

-- Perfiles
create table if not exists public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  gender text check (gender in ('M', 'F')),
  age int,
  height_cm numeric,
  weight_kg numeric,
  target_weight_kg numeric,
  goal text check (goal in ('Definir', 'Mantener', 'Volumen')),
  activity_level text,
  diet_type text default 'Estándar',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Logs diarios
create table if not exists public.daily_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete cascade,
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

-- Comidas del día
create table if not exists public.meal_entries (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete cascade,
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

-- Catálogo de alimentos
create table if not exists public.foods (
  id bigint generated always as identity primary key,
  source_id text,
  name text not null,
  category text,
  kcal_per_100g numeric,
  protein_g_per_100g numeric,
  carbs_g_per_100g numeric,
  fat_g_per_100g numeric,
  inserted_at timestamptz default now()
);

create index if not exists idx_daily_logs_user_date on public.daily_logs(user_id, log_date desc);
create index if not exists idx_meal_entries_user_date on public.meal_entries(user_id, log_date);
create index if not exists foods_source_idx on public.foods (source_id);
