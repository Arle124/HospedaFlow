package repository

import (
	"context"
	"errors"
	"fmt"

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
		&created.InitialCash,
		&created.CurrentCash,
		&created.ActualCash,
		&created.Difference,
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

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&s.ID,
		&s.UserID,
		&s.InitialCash,
		&s.CurrentCash,
		&s.ActualCash,
		&s.Difference,
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

	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&s.ID,
		&s.UserID,
		&s.InitialCash,
		&s.CurrentCash,
		&s.ActualCash,
		&s.Difference,
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
		&updated.InitialCash,
		&updated.CurrentCash,
		&updated.ActualCash,
		&updated.Difference,
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
	return &updated, nil
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
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&p.ID,
		&p.Name,
		&p.SKU,
		&p.Price,
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
