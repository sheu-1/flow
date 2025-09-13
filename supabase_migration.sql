-- Drop existing table if it exists (WARNING: This will delete all data)
drop table if exists public.transactions;

-- Create transactions table
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  category text,
  sender text,
  metadata jsonb,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.transactions enable row level security;

-- Policy: allow users to insert their own transactions (user_id must be auth.uid())
create policy "Insert own transactions" on public.transactions
  for insert with check (user_id = auth.uid());

-- Policy: allow users to select only their own transactions
create policy "Select own transactions" on public.transactions
  for select using (user_id = auth.uid());

-- Policy: allow users to update only their own transactions
create policy "Update own transactions" on public.transactions
  for update using (user_id = auth.uid());

-- Policy: allow users to delete only their own transactions
create policy "Delete own transactions" on public.transactions
  for delete using (user_id = auth.uid());

-- Optional test data (two users) - replace USER_UUID_1/2 with real user IDs when testing
-- insert into public.transactions (user_id, type, amount, category, sender, date) values
-- ('USER_UUID_1','expense',1200,'Food','Shop A', '2025-08-20'),
-- ('USER_UUID_1','income',5000,'Salary','Employer', '2025-08-01'),
-- ('USER_UUID_2','expense',300,'Transport','Taxi', '2025-08-22');