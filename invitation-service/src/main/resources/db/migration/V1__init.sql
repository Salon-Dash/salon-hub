CREATE TABLE IF NOT EXISTS invitations (
    id            BIGSERIAL PRIMARY KEY,
    business_id   BIGINT       NOT NULL,
    client_email  VARCHAR(255),
    client_name   VARCHAR(255),
    referral_code VARCHAR(100) UNIQUE,
    status        VARCHAR(20)  DEFAULT 'PENDING',
    invited_by    BIGINT,
    message       TEXT,
    created_at    TIMESTAMP    DEFAULT NOW(),
    expires_at    TIMESTAMP,
    sent_at       TIMESTAMP,
    accepted_at   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invitations_business_id  ON invitations(business_id);
CREATE INDEX IF NOT EXISTS idx_invitations_referral_code ON invitations(referral_code);
CREATE INDEX IF NOT EXISTS idx_invitations_email         ON invitations(client_email);
