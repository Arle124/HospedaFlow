-- Migración UP: Crear tabla de reservaciones futuras
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(50) NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    guest_contact VARCHAR(255),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    source VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    advance_payment NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    external_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
