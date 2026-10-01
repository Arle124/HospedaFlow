package repository

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/Arle124/HospedaSync/internal/domain"
)

// postgresRepository implementa la interfaz Repository usando pgxpool.
type postgresRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRepository retorna una implementación de persistencia para PostgreSQL.
func NewPostgresRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{
		pool: pool,
	}
}

// CreateShift inserta un nuevo turno en la base de datos.
func (r *postgresRepository) CreateShift(ctx context.Context, s *domain.Shift) (*domain.Shift, error) {
	query := `
		INSERT INTO shifts (
			user_id,
			initial_cash,
			current_cash,
			status,
			started_at,
			created_at,
			updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7
		)
		RETURNING id, user_id, initial_cash, current_cash, actual_cash, difference, status, COALESCE(notes, ''), started_at, ended_at, created_at, updated_at;
	`

	var created domain.Shift
	var statusStr string
	var initialCash, currentCash float64
	var actualCash, difference *float64

	err := r.pool.QueryRow(ctx, query,
		s.UserID,
		s.InitialCash,
		s.CurrentCash,
		string(s.Status),
		s.StartedAt,
		s.CreatedAt,
		s.UpdatedAt,
	).Scan(
		&created.ID,
		&created.UserID,
		&initialCash,
		&currentCash,
		&actualCash,
		&difference,
		&statusStr,
		&created.Notes,
		&created.StartedAt,
		&created.EndedAt,
		&created.CreatedAt,
		&created.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("error al insertar turno: %w", err)
	}

	created.Status = domain.ShiftStatus(statusStr)
	created.InitialCash = int64(math.Round(initialCash))
	created.CurrentCash = int64(math.Round(currentCash))
	if actualCash != nil {
		val := int64(math.Round(*actualCash))
		created.ActualCash = &val
	}
	if difference != nil {
		val := int64(math.Round(*difference))
		created.Difference = &val
	}
	return &created, nil
}

// GetShiftByID busca un turno por su identificador primario.
func (r *postgresRepository) GetShiftByID(ctx context.Context, id int64) (*domain.Shift, error) {
	query := `
		SELECT id, user_id, initial_cash, current_cash, actual_cash, difference, status, COALESCE(notes, ''), started_at, ended_at, created_at, updated_at
		FROM shifts
		WHERE id = $1
		LIMIT 1;
	`

	var s domain.Shift
	var statusStr string
	var initialCash, currentCash float64
	var actualCash, difference *float64

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&s.ID,
		&s.UserID,
		&initialCash,
		&currentCash,
		&actualCash,
		&difference,
		&statusStr,
		&s.Notes,
		&s.StartedAt,
		&s.EndedAt,
		&s.CreatedAt,
		&s.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("error al consultar turno con id %d: %w", id, err)
	}

	s.Status = domain.ShiftStatus(statusStr)
	s.InitialCash = int64(math.Round(initialCash))
	s.CurrentCash = int64(math.Round(currentCash))
	if actualCash != nil {
		val := int64(math.Round(*actualCash))
		s.ActualCash = &val
	}
	if difference != nil {
		val := int64(math.Round(*difference))
		s.Difference = &val
	}
	return &s, nil
}

// GetActiveShiftByUserID consulta si existe un turno activo en estado OPEN para el usuario.
func (r *postgresRepository) GetActiveShiftByUserID(ctx context.Context, userID int64) (*domain.Shift, error) {
	query := `
		SELECT id, user_id, initial_cash, current_cash, actual_cash, difference, status, COALESCE(notes, ''), started_at, ended_at, created_at, updated_at
		FROM shifts
		WHERE user_id = $1 AND status = 'OPEN'
		LIMIT 1;
	`

	var s domain.Shift
	var statusStr string
	var initialCash, currentCash float64
	var actualCash, difference *float64

	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&s.ID,
		&s.UserID,
		&initialCash,
		&currentCash,
		&actualCash,
		&difference,
		&statusStr,
		&s.Notes,
		&s.StartedAt,
		&s.EndedAt,
		&s.CreatedAt,
		&s.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error al buscar turno activo de usuario %d: %w", userID, err)
	}

	s.Status = domain.ShiftStatus(statusStr)
	s.InitialCash = int64(math.Round(initialCash))
	s.CurrentCash = int64(math.Round(currentCash))
	if actualCash != nil {
		val := int64(math.Round(*actualCash))
		s.ActualCash = &val
	}
	if difference != nil {
		val := int64(math.Round(*difference))
		s.Difference = &val
	}
	return &s, nil
}

// UpdateShift actualiza la información y balance de caja de un turno.
func (r *postgresRepository) UpdateShift(ctx context.Context, s *domain.Shift) (*domain.Shift, error) {
	query := `
		UPDATE shifts
		SET current_cash = $2,
			actual_cash = $3,
			difference = $4,
			status = $5,
			notes = $6,
			ended_at = $7,
			updated_at = $8
		WHERE id = $1
		RETURNING id, user_id, initial_cash, current_cash, actual_cash, difference, status, COALESCE(notes, ''), started_at, ended_at, created_at, updated_at;
	`

	var updated domain.Shift
	var statusStr string
	var initialCash, currentCash float64
	var actualCash, difference *float64

	err := r.pool.QueryRow(ctx, query,
		s.ID,
		s.CurrentCash,
		s.ActualCash,
		s.Difference,
		string(s.Status),
		s.Notes,
		s.EndedAt,
		s.UpdatedAt,
	).Scan(
		&updated.ID,
		&updated.UserID,
		&initialCash,
		&currentCash,
		&actualCash,
		&difference,
		&statusStr,
		&updated.Notes,
		&updated.StartedAt,
		&updated.EndedAt,
		&updated.CreatedAt,
		&updated.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("error al actualizar turno con id %d: %w", s.ID, err)
	}

	updated.Status = domain.ShiftStatus(statusStr)
	updated.InitialCash = int64(math.Round(initialCash))
	updated.CurrentCash = int64(math.Round(currentCash))
	if actualCash != nil {
		val := int64(math.Round(*actualCash))
		updated.ActualCash = &val
	}
	if difference != nil {
		val := int64(math.Round(*difference))
		updated.Difference = &val
	}
	return &updated, nil
}

// AddShiftTransaction registra un movimiento de caja / transacción dentro de un turno.
func (r *postgresRepository) AddShiftTransaction(ctx context.Context, tx *domain.ShiftTransaction) error {
	query := `
		INSERT INTO shift_transactions (shift_id, amount, type, concept)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`
	amountFloat := float64(tx.Amount)
	err := r.pool.QueryRow(ctx, query, tx.ShiftID, amountFloat, tx.Type, tx.Concept).Scan(&tx.ID, &tx.CreatedAt)
	if err != nil {
		return fmt.Errorf("error al registrar transacción de turno: %w", err)
	}
	return nil
}

// GetProductByID obtiene un producto del inventario por su id.
func (r *postgresRepository) GetProductByID(ctx context.Context, id int64) (*domain.Product, error) {
	query := `
		SELECT id, name, sku, price, stock, min_stock, created_at, updated_at
		FROM products
		WHERE id = $1
		LIMIT 1;
	`

	var p domain.Product
	var price float64
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&p.ID,
		&p.Name,
		&p.SKU,
		&price,
		&p.Stock,
		&p.MinStock,
		&p.CreatedAt,
		&p.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("error al obtener producto %d: %w", id, err)
	}

	p.Price = int64(math.Round(price))
	return &p, nil
}

// UpdateProductStock actualiza la cantidad en stock de un producto.
func (r *postgresRepository) UpdateProductStock(ctx context.Context, id int64, newStock int) error {
	query := `
		UPDATE products
		SET stock = $2, updated_at = NOW()
		WHERE id = $1;
	`

	cmdTag, err := r.pool.Exec(ctx, query, id, newStock)
	if err != nil {
		return fmt.Errorf("error al actualizar stock del producto %d: %w", id, err)
	}

	if cmdTag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}

	return nil
}

// UpdateRoomStatus actualiza el estado de una habitación.
func (r *postgresRepository) UpdateRoomStatus(ctx context.Context, id string, status string, notes string) error {
	query := `
		UPDATE rooms
		SET status = $2, notes = $3, updated_at = NOW()
		WHERE id = $1;
	`

	cmdTag, err := r.pool.Exec(ctx, query, id, status, notes)
	if err != nil {
		return fmt.Errorf("error al actualizar estado de habitación %s: %w", id, err)
	}

	if cmdTag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}

	return nil
}


// GetUserByEmail busca un usuario por su email.
func (r *postgresRepository) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, name, email, password_hash, role, active, created_at
		FROM users
		WHERE email = $1
		LIMIT 1;
	`

	var u domain.User
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&u.ID,
		&u.Name,
		&u.Email,
		&u.PasswordHash,
		&u.Role,
		&u.Active,
		&u.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("error al obtener usuario por email %s: %w", email, err)
	}
	return &u, nil
}

// GetUserByID busca un usuario por su ID.
func (r *postgresRepository) GetUserByID(ctx context.Context, id int64) (*domain.User, error) {
	query := `
		SELECT id, name, email, password_hash, role, active, created_at
		FROM users
		WHERE id = $1
		LIMIT 1;
	`

	var u domain.User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&u.ID,
		&u.Name,
		&u.Email,
		&u.PasswordHash,
		&u.Role,
		&u.Active,
		&u.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("error al obtener usuario por id %d: %w", id, err)
	}
	return &u, nil
}

// CreateSession inserta una nueva sesión en la base de datos.
func (r *postgresRepository) CreateSession(ctx context.Context, session *domain.UserSession) error {
	query := `
		INSERT INTO user_sessions (
			user_id, token_hash, ip_address, user_agent, expires_at, created_at
		) VALUES (
			$1, $2, $3, $4, $5, NOW()
		)
		RETURNING id, created_at;
	`
	err := r.pool.QueryRow(ctx, query,
		session.UserID,
		session.TokenHash,
		session.IPAddress,
		session.UserAgent,
		session.ExpiresAt,
	).Scan(&session.ID, &session.CreatedAt)

	if err != nil {
		return fmt.Errorf("error al crear sesión: %w", err)
	}
	return nil
}

// GetActiveSession obtiene una sesión activa (no revocada y no expirada) por el hash de token.
func (r *postgresRepository) GetActiveSession(ctx context.Context, tokenHash string) (*domain.UserSession, error) {
	query := `
		SELECT id, user_id, token_hash, ip_address, user_agent, expires_at, revoked_at, created_at
		FROM user_sessions
		WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
		LIMIT 1;
	`
	var s domain.UserSession
	err := r.pool.QueryRow(ctx, query, tokenHash).Scan(
		&s.ID,
		&s.UserID,
		&s.TokenHash,
		&s.IPAddress,
		&s.UserAgent,
		&s.ExpiresAt,
		&s.RevokedAt,
		&s.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("error al obtener sesión activa: %w", err)
	}
	return &s, nil
}

// RevokeSession revoca una sesión marcando su fecha de revocación.
func (r *postgresRepository) RevokeSession(ctx context.Context, tokenHash string) error {
	query := `
		UPDATE user_sessions
		SET revoked_at = NOW()
		WHERE token_hash = $1 AND revoked_at IS NULL;
	`
	_, err := r.pool.Exec(ctx, query, tokenHash)
	if err != nil {
		return fmt.Errorf("error al revocar sesión: %w", err)
	}
	return nil
}

// RevokeAllUserSessions revoca todas las sesiones activas de un usuario.
func (r *postgresRepository) RevokeAllUserSessions(ctx context.Context, userID int64) error {
	query := `
		UPDATE user_sessions
		SET revoked_at = NOW()
		WHERE user_id = $1 AND revoked_at IS NULL;
	`
	_, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("error al revocar todas las sesiones del usuario %d: %w", userID, err)
	}
	return nil
}

func (r *postgresRepository) CreateReservation(ctx context.Context, res *domain.Reservation) error {
	query := `
		INSERT INTO reservations (
			id, room_id, guest_name, guest_contact, check_in_date, check_out_date,
			status, source, total_price, advance_payment, notes, external_id
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
		) RETURNING created_at, updated_at
	`
	
	// En COP los valores monetarios son enteros directos hacia NUMERIC(12,2)
	totalPriceFloat := float64(res.TotalPrice)
	advancePaymentFloat := float64(res.AdvancePayment)

	err := r.pool.QueryRow(ctx, query,
		res.ID,
		res.RoomID,
		res.GuestName,
		res.GuestContact,
		res.CheckInDate,
		res.CheckOutDate,
		res.Status,
		res.Source,
		totalPriceFloat,
		advancePaymentFloat,
		res.Notes,
		res.ExternalID,
	).Scan(&res.CreatedAt, &res.UpdatedAt)

	if err != nil {
		log.Printf("ERROR postgresRepository.CreateReservation: %v\n", err)
		return err
	}
	return nil
}

func (r *postgresRepository) UpdateReservation(ctx context.Context, id string, update *domain.UpdateReservationInput) error {
	query := `
		UPDATE reservations
		SET room_id = COALESCE($2, room_id),
		    guest_name = COALESCE($3, guest_name),
		    guest_contact = COALESCE($4, guest_contact),
		    check_in_date = COALESCE($5, check_in_date),
		    check_out_date = COALESCE($6, check_out_date),
		    status = COALESCE($7, status),
		    total_price = COALESCE($8, total_price),
		    advance_payment = COALESCE($9, advance_payment),
		    notes = COALESCE($10, notes),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`
	var tpFloat, apFloat *float64
	if update.TotalPrice != nil {
		val := float64(*update.TotalPrice)
		tpFloat = &val
	}
	if update.AdvancePayment != nil {
		val := float64(*update.AdvancePayment)
		apFloat = &val
	}

	var statusStr *string
	if update.Status != nil {
		s := string(*update.Status)
		statusStr = &s
	}

	tag, err := r.pool.Exec(ctx, query,
		id,
		update.RoomID,
		update.GuestName,
		update.GuestContact,
		update.CheckInDate,
		update.CheckOutDate,
		statusStr,
		tpFloat,
		apFloat,
		update.Notes,
	)
	if err != nil {
		log.Printf("ERROR postgresRepository.UpdateReservation: %v\n", err)
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *postgresRepository) UpdateReservationStatus(ctx context.Context, id string, status domain.ReservationStatus) error {
	return r.UpdateReservation(ctx, id, &domain.UpdateReservationInput{
		Status: &status,
	})
}

func (r *postgresRepository) GetReservationsByDateRange(ctx context.Context, start, end string) ([]*domain.Reservation, error) {
	query := `
		SELECT id, room_id, guest_name, guest_contact, check_in_date, check_out_date,
		       status, source, total_price, advance_payment, notes, external_id, created_at, updated_at
		FROM reservations
		WHERE check_in_date <= $2 AND check_out_date >= $1
	`
	rows, err := r.pool.Query(ctx, query, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reservations []*domain.Reservation
	for rows.Next() {
		var res domain.Reservation
		var tpFloat, apFloat float64
		err := rows.Scan(
			&res.ID, &res.RoomID, &res.GuestName, &res.GuestContact, &res.CheckInDate, &res.CheckOutDate,
			&res.Status, &res.Source, &tpFloat, &apFloat, &res.Notes, &res.ExternalID, &res.CreatedAt, &res.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		// Convert NUMERIC(12,2) float back to int64 sin distorsión de centavos
		res.TotalPrice = int64(math.Round(tpFloat))
		res.AdvancePayment = int64(math.Round(apFloat))
		reservations = append(reservations, &res)
	}
	return reservations, nil
}
