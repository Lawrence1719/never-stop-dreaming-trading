-- delete_duplicate_order.sql
-- Script to delete a specific duplicate order
-- IMPORTANT: Review the duplicate detection query first to identify which order to delete
-- This script deletes the later order (duplicate) and keeps the earlier one (original)

-- Example: Delete the duplicate order df2baf8f-1965-4fb9-87b5-3e7211736539
-- Keep the original order 4484c029-4df7-4fdc-9eb1-d3a33055427c

-- Step 1: Mark as duplicate (safer than immediate deletion)
UPDATE public.orders
SET status = 'cancelled'
WHERE id = 'df2baf8f-1965-4fb9-87b5-3e7211736539';

-- Step 2: Add note/comment (if you have a notes column)
-- UPDATE public.orders
-- SET notes = 'Duplicate order - cancelled automatically'
-- WHERE id = 'df2baf8f-1965-4fb9-87b5-3e7211736539';

-- Step 3: If you want to actually delete (uncomment after review):
-- DELETE FROM public.orders
-- WHERE id = 'df2baf8f-1965-4fb9-87b5-3e7211736539';

-- Verification query after deletion:
-- SELECT id, status, created_at, total, payment_method
-- FROM public.orders
-- WHERE id IN (
--   '4484c029-4df7-4fdc-9eb1-d3a33055427c',
--   'df2baf8f-1965-4fb9-87b5-3e7211736539'
-- );

