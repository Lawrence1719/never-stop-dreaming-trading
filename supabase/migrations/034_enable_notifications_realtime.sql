-- Enable Realtime for notifications table
-- This adds the table to the supabase_realtime publication
BEGIN;
  -- For PostgreSQL tables to be tracked by Realtime, they must be part of the supabase_realtime publication
  -- Check if the publication exists first
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      -- Add notifications table to the publication if it's not already there
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'notifications'
      ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
      END IF;
    END IF;
  END $$;
COMMIT;
