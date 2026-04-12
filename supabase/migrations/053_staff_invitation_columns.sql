-- 053_staff_invitation_columns.sql
-- Adds columns to track staff invitation state and backfills existing staff.

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS invitation_status text 
    DEFAULT 'accepted' 
    CHECK (invitation_status IN ('pending', 'accepted')),
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- Backfill existing staff as accepted (they were created directly)
UPDATE public.profiles 
  SET invitation_status = 'accepted'
  WHERE role IN ('admin', 'courier') 
  AND invited_at IS NULL;
