-- V3: add addons and quick_sale_items tables

CREATE TABLE IF NOT EXISTS addons (
    id           BIGSERIAL PRIMARY KEY,
    business_id  BIGINT NOT NULL,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    price        DECIMAL(10, 2),
    price_type   VARCHAR(20)  DEFAULT 'FIXED',
    color        VARCHAR(50),
    is_active    BOOLEAN      DEFAULT true,
    is_visible   BOOLEAN      DEFAULT true,
    created_at   TIMESTAMP    DEFAULT NOW(),
    updated_at   TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quick_sale_items (
    id               BIGSERIAL PRIMARY KEY,
    business_id      BIGINT NOT NULL,
    service_id       BIGINT NOT NULL,
    service_name     VARCHAR(255),
    service_type     VARCHAR(50) DEFAULT 'SERVICE',
    duration_minutes INT,
    price            DECIMAL(10, 2),
    price_type       VARCHAR(20) DEFAULT 'FIXED',
    color            VARCHAR(50),
    display_order    INT         DEFAULT 0,
    created_at       TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addons_business_id         ON addons (business_id);
CREATE INDEX IF NOT EXISTS idx_quick_sale_items_business  ON quick_sale_items (business_id);
