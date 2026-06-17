-- Flyway V1 init: business-service schema
-- Database: booksy_platform

CREATE TABLE IF NOT EXISTS businesses (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255),
    address     TEXT,
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    description TEXT,
    phone       VARCHAR(50),
    website     VARCHAR(255),
    category    VARCHAR(100),
    status      VARCHAR(20)  DEFAULT 'ACTIVE',
    owner_id    BIGINT,
    created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100),
    business_id INT,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
    id           BIGSERIAL PRIMARY KEY,
    business_id  INT,
    name         VARCHAR(255),
    price        DECIMAL(10, 2),
    duration     INT,
    description  TEXT,
    service_type VARCHAR(50),
    category_id  INT,
    is_active    BOOLEAN   DEFAULT true,
    is_visible   BOOLEAN   DEFAULT true,
    created_at   TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_services_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS staff (
    id          BIGSERIAL PRIMARY KEY,
    business_id INT,
    name        VARCHAR(255),
    position    VARCHAR(100),
    is_active   BOOLEAN   DEFAULT true,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_status      ON businesses (status);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id    ON businesses (owner_id);
CREATE INDEX IF NOT EXISTS idx_categories_business_id ON categories (business_id);
CREATE INDEX IF NOT EXISTS idx_services_business_id   ON services (business_id);
CREATE INDEX IF NOT EXISTS idx_staff_business_id      ON staff (business_id);
