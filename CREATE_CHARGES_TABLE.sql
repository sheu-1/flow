-- Run this in your Supabase SQL Editor to create the new charges table
-- This isolates transaction costs and access fees from the main transactions table.

CREATE TABLE IF NOT EXISTS public.charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  charge_type TEXT NOT NULL CHECK (charge_type IN ('transaction_cost', 'access_fee')),
  reference_number TEXT,
  description TEXT,
  metadata JSONB,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_charges_user_date ON public.charges (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_charges_type ON public.charges (charge_type);
CREATE INDEX IF NOT EXISTS idx_charges_reference ON public.charges (reference_number);

-- Enable RLS
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own charges" ON public.charges
  FOR ALL USING (user_id = auth.uid());

-- Trigger for updated_at (assumes update_updated_at_column() exists from transactions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_charges_updated_at'
  ) THEN
    CREATE TRIGGER update_charges_updated_at 
      BEFORE UPDATE ON public.charges
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- Success message
SELECT 'Charges table isolated and created successfully!' as status;
