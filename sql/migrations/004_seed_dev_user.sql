-- Seed user for development (password: 'admin1234')
INSERT INTO users (name, email, password_hash, role)
VALUES ('Administrador', 'admin@hospedaflow.local', '$2a$10$OZn8PSCEsc6L2M9KurcrB.IerIfZnkNsPED2Ct.QoxXdhXrfaiG9a', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password_hash, role)
VALUES ('Recepcionista Demo', 'recepcion@hospedaflow.local', '$2a$10$OZn8PSCEsc6L2M9KurcrB.IerIfZnkNsPED2Ct.QoxXdhXrfaiG9a', 'receptionist')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password_hash, role)
VALUES ('Administrador Legacy', 'admin@hospedasync.local', '$2a$10$OZn8PSCEsc6L2M9KurcrB.IerIfZnkNsPED2Ct.QoxXdhXrfaiG9a', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password_hash, role)
VALUES ('Recepcionista Legacy', 'recepcion@hospedasync.local', '$2a$10$OZn8PSCEsc6L2M9KurcrB.IerIfZnkNsPED2Ct.QoxXdhXrfaiG9a', 'receptionist')
ON CONFLICT (email) DO NOTHING;
