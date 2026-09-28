ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS user_sessions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    token_hash  VARCHAR(64) NOT NULL,
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user  ON user_sessions(user_id) WHERE revoked_at IS NULL;
