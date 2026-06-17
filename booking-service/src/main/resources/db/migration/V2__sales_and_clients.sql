-- V2: Add sales tables and clients table to booking-service schema

-- Sales table (for manual sales / POS transactions)
CREATE TABLE IF NOT EXISTS sales (
    id                 BIGSERIAL PRIMARY KEY,
    business_id        INT          NOT NULL,
    staff_id           INT,
    client_id          INT,
    client_name        VARCHAR(255),
    client_phone       VARCHAR(50),
    client_email       VARCHAR(255),
    sale_date          DATE         NOT NULL DEFAULT CURRENT_DATE,
    sale_time          TIME         NOT NULL DEFAULT CURRENT_TIME,
    subtotal           DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount    DECIMAL(10,2) DEFAULT 0,
    discount_percent   DECIMAL(5,2)  DEFAULT 0,
    tip_amount         DECIMAL(10,2) DEFAULT 0,
    tip_percent        DECIMAL(5,2)  DEFAULT 0,
    total              DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method     VARCHAR(50)  DEFAULT 'CASH',
    payment_amount     DECIMAL(10,2) DEFAULT 0,
    change_amount      DECIMAL(10,2) DEFAULT 0,
    split_cash_amount  DECIMAL(10,2),
    split_card_amount  DECIMAL(10,2),
    status             VARCHAR(20)  DEFAULT 'COMPLETED',
    notes              TEXT,
    bill_number        VARCHAR(50),
    bill_id            VARCHAR(100),
    created_at         TIMESTAMP    DEFAULT NOW(),
    updated_at         TIMESTAMP    DEFAULT NOW()
);

-- Line items for sales
CREATE TABLE IF NOT EXISTS sale_items (
    id           BIGSERIAL PRIMARY KEY,
    sale_id      BIGINT       NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    service_id   INT,
    service_name VARCHAR(255),
    service_type VARCHAR(50),
    quantity     INT          DEFAULT 1,
    unit_price   DECIMAL(10,2),
    total_price  DECIMAL(10,2),
    duration     VARCHAR(50),
    notes        TEXT
);

-- Lightweight clients table (for manual client creation in the admin dashboard)
CREATE TABLE IF NOT EXISTS clients (
    id                        BIGSERIAL PRIMARY KEY,
    business_id               INT          NOT NULL,
    first_name                VARCHAR(100) NOT NULL,
    last_name                 VARCHAR(100),
    email                     VARCHAR(255),
    phone                     VARCHAR(50),
    birthday                  DATE,
    gender                    VARCHAR(20),
    address                   TEXT,
    city                      VARCHAR(100),
    state                     VARCHAR(100),
    zip_code                  VARCHAR(20),
    country                   VARCHAR(100),
    notes                     TEXT,
    avatar_url                VARCHAR(500),
    preferred_language        VARCHAR(20),
    preferred_contact_method  VARCHAR(50),
    status                    VARCHAR(20)  DEFAULT 'ACTIVE',
    allow_marketing_emails    BOOLEAN,
    allow_sms_notifications   BOOLEAN,
    created_at                TIMESTAMP    DEFAULT NOW(),
    updated_at                TIMESTAMP    DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_business_id   ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date      ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_staff_id       ON sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id   ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_clients_business_id  ON clients(business_id);
CREATE INDEX IF NOT EXISTS idx_clients_email        ON clients(email);
