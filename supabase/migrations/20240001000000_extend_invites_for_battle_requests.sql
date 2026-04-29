-- Migration: extend invites table for battle-request-notifications
-- Idempotent where possible using DO $$ blocks and IF NOT EXISTS checks

-- 1. Add new columns to invites table (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invites' AND column_name = 'checkin_deadline'
  ) THEN
    ALTER TABLE invites ADD COLUMN checkin_deadline timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invites' AND column_name = 'challenger_checked_in'
  ) THEN
    ALTER TABLE invites ADD COLUMN challenger_checked_in boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invites' AND column_name = 'opponent_checked_in'
  ) THEN
    ALTER TABLE invites ADD COLUMN opponent_checked_in boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2. Normalise existing status values from lowercase to uppercase
UPDATE invites SET status = 'PENDING'  WHERE status = 'pending';
UPDATE invites SET status = 'ACCEPTED' WHERE status = 'accepted';
UPDATE invites SET status = 'REJECTED' WHERE status = 'rejected';
UPDATE invites SET status = 'LIVE'     WHERE status = 'live';
UPDATE invites SET status = 'ARCHIVED' WHERE status = 'archived';

-- 3. Create unique partial index to prevent duplicate PENDING requests
--    (idempotent: CREATE INDEX IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS invites_pending_unique
  ON invites (from_name, to_name, challenge)
  WHERE status = 'PENDING';
