ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE users
SET username = CONCAT('legacy_', SUBSTRING(id::text FROM 1 FOR 8))
WHERE username IS NULL;

UPDATE users
SET password_hash = 'legacy_password_hash'
WHERE password_hash IS NULL;

ALTER TABLE users
  ALTER COLUMN username SET NOT NULL,
  ALTER COLUMN password_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique
  ON users(username);
