-- Migration: fix notifications table schema
-- Adds any columns that may be missing if the table was created without the full schema.
-- All statements are idempotent.

DO $$
BEGIN
  -- Add payload column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'payload'
  ) THEN
    ALTER TABLE notifications ADD COLUMN payload jsonb NOT NULL DEFAULT '{}';
  END IF;

  -- Add invite_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'invite_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN invite_id uuid REFERENCES invites(id) ON DELETE CASCADE;
  END IF;

  -- Add read column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'read'
  ) THEN
    ALTER TABLE notifications ADD COLUMN read boolean NOT NULL DEFAULT false;
  END IF;

  -- Add type column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN type text NOT NULL DEFAULT 'battle_request';
  END IF;
END $$;

-- Recreate the index in case it was also missing
CREATE INDEX IF NOT EXISTS notifications_user_unread
  ON notifications (user_id, read, created_at DESC);
