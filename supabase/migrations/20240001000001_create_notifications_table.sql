CREATE TABLE IF NOT EXISTS notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL,
  type          text NOT NULL,
  invite_id     uuid REFERENCES invites(id) ON DELETE CASCADE,
  payload       jsonb NOT NULL DEFAULT '{}',
  read          boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread
  ON notifications (user_id, read, created_at DESC);
