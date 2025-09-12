-- Example Supabase SQL migration for Cashflow Tracker
-- Requires pgcrypto or pg_gen_random UUID, depending on your project. Supabase usually enables gen_random_uuid().

create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income','expense')),
  amount numeric not null,
  category text,
  sender text,
  description text,
  date timestamptz default now(),
  created_at timestamptz default now()
);

-- RLS: one row per user
alter table public.transactions enable row level security;

create policy "Users can view own transactions"
  on public.transactions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.transactions
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions
  for delete
  using (auth.uid() = user_id);
