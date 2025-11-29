-- 013_add_duplicate_detection_trigger.sql
-- Database-level trigger to catch duplicate orders
-- This provides an additional layer of protection beyond frontend/backend checks

-- Create function to detect and handle duplicates
CREATE OR REPLACE FUNCTION public.detect_duplicate_order()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_count INTEGER;
  existing_order_id UUID;
BEGIN
  -- Check if there's another order from the same user with same total within last 5 seconds
  -- Get the first (earliest) existing order ID
  SELECT id INTO existing_order_id
  FROM public.orders
  WHERE user_id = NEW.user_id
    AND total = NEW.total
    AND payment_method = NEW.payment_method
    AND id != NEW.id  -- Exclude current order
    AND created_at >= NOW() - INTERVAL '5 seconds'
    AND status NOT IN ('cancelled', 'duplicate')
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If duplicate found, mark this order as duplicate
  IF existing_order_id IS NOT NULL THEN
    -- Count total duplicates for logging
    SELECT COUNT(*) INTO duplicate_count
    FROM public.orders
    WHERE user_id = NEW.user_id
      AND total = NEW.total
      AND payment_method = NEW.payment_method
      AND id != NEW.id
      AND created_at >= NOW() - INTERVAL '5 seconds'
      AND status NOT IN ('cancelled', 'duplicate');
    
    -- Log the duplicate attempt (you can create a duplicates_log table if needed)
    RAISE WARNING 'Duplicate order detected: user_id=%, total=%, existing_order_id=%, new_order_id=%, count=%', 
      NEW.user_id, NEW.total, existing_order_id, NEW.id, duplicate_count;
    
    -- Mark as duplicate instead of allowing normal insert
    NEW.status := 'duplicate';
    
    -- Optionally: You could prevent the insert entirely by raising an exception
    -- RAISE EXCEPTION 'Duplicate order detected. Order % already exists.', existing_order_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before insert
DROP TRIGGER IF EXISTS trg_detect_duplicate_order ON public.orders;
CREATE TRIGGER trg_detect_duplicate_order
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.detect_duplicate_order();

-- Note: This trigger will mark duplicates, but idempotency_key check should prevent most cases
-- This is a safety net for edge cases

