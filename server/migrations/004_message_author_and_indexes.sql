ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_created_by_user_id
  ON messages(created_by_user_id);
