-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'order', 'stock', 'system')),
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  target_role TEXT DEFAULT 'customer' CHECK (target_role IN ('customer', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure target_role exists even if the table was created previously without it
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='target_role') THEN
    ALTER TABLE notifications ADD COLUMN target_role TEXT DEFAULT 'customer' CHECK (target_role IN ('customer', 'admin'));
  END IF;
  
  -- Update type constraint to include new types
  -- First drop the old constraint if it exists (might have a different name)
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  -- Add the new constraint
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('info', 'success', 'warning', 'error', 'order', 'stock', 'system'));
END $$;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    auth.uid() = user_id 
    AND (
      target_role = 'customer' 
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
CREATE POLICY "Admins can view all notifications"
  ON notifications FOR SELECT
  USING (
    public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    public.is_admin()
  );

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read, target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable pg_cron if available (Supabase usually has it)
-- Note: This requires 'cron' to be in your 'ext-supabase' configuration
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Scheduled job to delete notifications older than 30 days
-- Runs every day at midnight
-- Wrapped in a block to prevent failure if cron extension isn't fully enabled
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron') THEN
    PERFORM cron.schedule(
      'delete-old-notifications', 
      '0 0 * * *', 
      $q$ DELETE FROM notifications WHERE created_at < now() - interval '30 days' $q$
    );
  END IF;
END $$;

-- Function to maintain a cap of 50 unread notifications per user
CREATE OR REPLACE FUNCTION cap_unread_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user has more than 50 unread notifications, delete the oldest ones
  DELETE FROM notifications
  WHERE id IN (
    SELECT id
    FROM notifications
    WHERE user_id = NEW.user_id AND is_read = FALSE
    ORDER BY created_at DESC
    OFFSET 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run the cap function on every insert
DROP TRIGGER IF EXISTS tr_cap_unread_notifications ON notifications;
CREATE TRIGGER tr_cap_unread_notifications
AFTER INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION cap_unread_notifications();
