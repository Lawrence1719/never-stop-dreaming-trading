-- 009_create_addresses_table.sql
-- Create addresses table for normalized address storage

CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  address_type TEXT DEFAULT 'shipping',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_default ON public.addresses (user_id, is_default) WHERE is_default = TRUE;

-- Helper function to keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set updated_at on update
DROP TRIGGER IF EXISTS trg_set_updated_at_addresses ON public.addresses;
CREATE TRIGGER trg_set_updated_at_addresses
BEFORE UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_column();

-- Enable RLS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own addresses
CREATE POLICY "Addresses: users can view own addresses"
  ON public.addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Addresses: users can insert own addresses"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Addresses: users can update own addresses"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Addresses: users can delete own addresses"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  -- If this address is being set as default, unset all other defaults for this user
  IF NEW.is_default = TRUE THEN
    UPDATE public.addresses
    SET is_default = FALSE
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single default address
DROP TRIGGER IF EXISTS trg_ensure_single_default_address ON public.addresses;
CREATE TRIGGER trg_ensure_single_default_address
BEFORE INSERT OR UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_address();

