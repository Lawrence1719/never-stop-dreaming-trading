-- 036_add_review_moderation_columns.sql
-- Add moderation and admin reply columns to reviews table

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS admin_reply text,
  ADD COLUMN IF NOT EXISTS is_overridden boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS variant_name text;

-- Update existing reviews to have approved status and moderated_at if they don't have it
UPDATE public.reviews 
SET 
  status = 'approved',
  moderated_at = NOW()
WHERE status IS NULL;

-- Ensure RLS policies still apply or update if needed
-- (Select policy already allows everyone to read)
