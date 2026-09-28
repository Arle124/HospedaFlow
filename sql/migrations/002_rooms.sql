CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(10) PRIMARY KEY,
    number VARCHAR(10) NOT NULL,
    floor INT NOT NULL DEFAULT 1,
    type VARCHAR(20) NOT NULL DEFAULT 'single',
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    guest_name VARCHAR(200),
    guests_count INT DEFAULT 0,
    payment_status VARCHAR(20),
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
