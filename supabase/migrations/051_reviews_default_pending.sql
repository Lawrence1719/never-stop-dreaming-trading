-- 051_reviews_default_pending.sql
-- Change reviews.status DEFAULT from 'approved' to 'pending' so every
-- new review waits for admin moderation before becoming visible.
--
-- The CHECK constraint is also expanded to include 'pending' as a valid state.

ALTER TABLE public.reviews
  ALTER COLUMN status SET DEFAULT 'pending';

-- Ensure the CHECK constraint allows pending (re-create it cleanly).
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_status_check;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'));
