-- Migración DOWN: Reversión de tablas iniciales de HospedaSync

DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS shift_transactions;
DROP TABLE IF EXISTS shifts;
DROP TABLE IF EXISTS users;
