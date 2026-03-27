-- Update notifications_type_check constraint to include 'user' type
DO $$ 
BEGIN 
  -- Drop the old constraint
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  
  -- Add the new constraint with 'user' type included
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('info', 'success', 'warning', 'error', 'order', 'stock', 'system', 'user'));
END $$;
  