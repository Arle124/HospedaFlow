package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/Arle124/HospedaSync/internal/domain"
)

// Repository define el contrato de acceso a datos para HospedaSync.
// En producción, esta capa se complementa con los métodos generados por sqlc (Querier).
type Repository interface {
	ShiftRepository
	InventoryRepository
}

// ShiftRepository define las operaciones de persistencia para turnos y caja.
type ShiftRepository interface {
	CreateShift(ctx context.Context, shift *domain.Shift) (*domain.Shift, error)
	GetShiftByID(ctx context.Context, id int64) (*domain.Shift, error)
	GetActiveShiftByUserID(ctx context.Context, userID int64) (*domain.Shift, error)
	UpdateShift(ctx context.Context, shift *domain.Shift) (*domain.Shift, error)
}

// InventoryRepository define las operaciones de persistencia para inventario.
type InventoryRepository interface {
	GetProductByID(ctx context.Context, id int64) (*domain.Product, error)
	UpdateProductStock(ctx context.Context, id int64, newStock int) error
}

// NewDBPool inicializa y valida un pool de conexiones PostgreSQL con pgx/v5.
func NewDBPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("error al parsear string de conexión: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("error al crear pool de conexiones: %w", err)
	}

	return pool, nil
}
