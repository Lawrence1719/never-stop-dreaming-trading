-- duplicate_orders_detection.sql
-- Query to find duplicate orders in the database
-- Duplicates are defined as orders with:
-- - Same user_id
-- - Same total amount
-- - Same payment_method
-- - Created within 2 seconds of each other

-- Find all potential duplicate order pairs
WITH order_pairs AS (
  SELECT 
    o1.id as order1_id,
    o1.user_id,
    o1.total,
    o1.payment_method,
    o1.created_at as order1_created,
    o1.status as order1_status,
    o2.id as order2_id,
    o2.created_at as order2_created,
    o2.status as order2_status,
    EXTRACT(EPOCH FROM (o2.created_at - o1.created_at)) as seconds_apart
  FROM public.orders o1
  INNER JOIN public.orders o2 
    ON o1.user_id = o2.user_id
    AND o1.total = o2.total
    AND o1.payment_method = o2.payment_method
    AND o1.id < o2.id  -- Avoid duplicate pairs (A-B and B-A)
  WHERE 
    -- Created within 2 seconds of each other
    o2.created_at BETWEEN o1.created_at AND o1.created_at + INTERVAL '2 seconds'
    -- Exclude already cancelled/duplicate orders
    AND o1.status NOT IN ('cancelled', 'duplicate')
    AND o2.status NOT IN ('cancelled', 'duplicate')
)
SELECT 
  order1_id,
  order2_id,
  user_id,
  total,
  payment_method,
  order1_created,
  order2_created,
  seconds_apart,
  order1_status,
  order2_status,
  CASE 
    WHEN order1_created < order2_created THEN order1_id
    ELSE order2_id
  END as keep_order_id,
  CASE 
    WHEN order1_created < order2_created THEN order2_id
    ELSE order1_id
  END as duplicate_order_id
FROM order_pairs
ORDER BY order1_created DESC;

-- Summary count of duplicates
-- SELECT 
--   COUNT(*) as total_duplicate_pairs,
--   COUNT(DISTINCT user_id) as affected_users
-- FROM order_pairs;









