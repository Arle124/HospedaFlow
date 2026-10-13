-- Sembrado de habitaciones iniciales (alineado con Dexie.js en frontend)
INSERT INTO rooms (id, number, floor, type, status, price, notes)
VALUES
    ('101', '101', 1, 'matrimonial', 'available', 80000, ''),
    ('102', '102', 1, 'double', 'occupied', 95000, ''),
    ('103', '103', 1, 'single', 'dirty', 60000, 'Salida de huésped a las 09:00'),
    ('201', '201', 2, 'suite', 'available', 140000, ''),
    ('202', '202', 2, 'matrimonial', 'cleaning', 85000, ''),
    ('203', '203', 2, 'double', 'dirty', 95000, ''),
    ('204', '204', 2, 'single', 'maintenance', 60000, 'Fuga de agua en lavamanos')
ON CONFLICT (id) DO NOTHING;

-- Sembrado de productos de minibar
INSERT INTO products (name, sku, price, stock, min_stock)
VALUES
    ('Agua Mineral 600ml', 'SKU-AGUA-600', 3000, 24, 5),
    ('Cerveza Club Colombia', 'SKU-CERV-CC', 6000, 18, 5),
    ('Paquete de Snacks', 'SKU-SNAK-01', 3500, 15, 5),
    ('Gaseosa Coca-Cola', 'SKU-COCA-350', 4000, 20, 5)
ON CONFLICT (sku) DO NOTHING;
