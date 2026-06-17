-- Flyway V1 init: auth-service schema
-- Database: booksy_platform

CREATE TABLE IF NOT EXISTS users (
    id             BIGSERIAL PRIMARY KEY,
    email          VARCHAR(255) UNIQUE NOT NULL,
    password_hash  VARCHAR(255)        NOT NULL,
    first_name     VARCHAR(100),
    last_name      VARCHAR(100),
    phone          VARCHAR(50),
    role           VARCHAR(50) NOT NULL DEFAULT 'BUSINESS_OWNER',
    is_active      BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token      VARCHAR(512) UNIQUE NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email              ON users (email);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token     ON refresh_tokens (token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id   ON refresh_tokens (user_id);
