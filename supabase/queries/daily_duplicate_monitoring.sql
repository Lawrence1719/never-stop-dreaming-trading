-- daily_duplicate_monitoring.sql
-- Daily query to detect duplicate orders
-- Run this daily (e.g., at 2 AM) to monitor for duplicate orders
-- Can be set up as a scheduled job or cron task

-- Find duplicates from the last 24 hours
WITH recent_duplicates AS (
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
    AND o1.id < o2.id
  WHERE 
    -- Created within last 24 hours
    o1.created_at >= NOW() - INTERVAL '24 hours'
    AND o2.created_at >= NOW() - INTERVAL '24 hours'
    -- Created within 2 seconds of each other
    AND o2.created_at BETWEEN o1.created_at AND o1.created_at + INTERVAL '2 seconds'
    -- Exclude already cancelled/duplicate orders
    AND o1.status NOT IN ('cancelled', 'duplicate')
    AND o2.status NOT IN ('cancelled', 'duplicate')
)
SELECT 
  COUNT(*) as duplicate_count,
  COUNT(DISTINCT user_id) as affected_users,
  json_agg(
    json_build_object(
      'order1_id', order1_id,
      'order2_id', order2_id,
      'user_id', user_id,
      'total', total,
      'payment_method', payment_method,
      'seconds_apart', seconds_apart,
      'order1_created', order1_created,
      'order2_created', order2_created
    )
  ) as duplicate_details
FROM recent_duplicates;

-- If duplicate_count > 0, send alert




