-- Flyway V1 init: booking-service schema
-- Database: booksy_platform

CREATE TABLE IF NOT EXISTS services (
    id           BIGSERIAL PRIMARY KEY,
    business_id  INT,
    name         VARCHAR(255),
    price        DECIMAL(10, 2),
    duration     INT,
    description  TEXT,
    service_type VARCHAR(50),
    category_id  INT,
    is_active    BOOLEAN DEFAULT true,
    is_visible   BOOLEAN DEFAULT true,
    created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id               BIGSERIAL PRIMARY KEY,
    business_id      INT,
    staff_id         INT,
    client_id        INT,
    service_id       INT,
    appointment_date DATE,
    start_time       TIME,
    end_time         TIME,
    status           VARCHAR(20),
    payment_status   VARCHAR(20),
    service_name     VARCHAR(255),
    client_name      VARCHAR(255),
    client_phone     VARCHAR(50),
    client_email     VARCHAR(255),
    price            DECIMAL(10, 2),
    color            VARCHAR(20),
    notes            TEXT,
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_business_id      ON appointments (business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id         ON appointments (staff_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON appointments (appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status           ON appointments (status);
CREATE INDEX IF NOT EXISTS idx_services_business_id          ON services (business_id);
