package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/Arle124/HospedaSync/internal/domain"
)

// Repository define el contrato de acceso a datos para HospedaSync.
// En producción, esta capa se complementa con los métodos generados por sqlc (Querier).
type Repository interface {
	ShiftRepository
	InventoryRepository
	RoomRepository
	UserRepository
	ReservationRepository
}

// UserRepository define las operaciones de persistencia para usuarios y sesiones.
type UserRepository interface {
	GetUserByEmail(ctx context.Context, email string) (*domain.User, error)
	GetUserByID(ctx context.Context, id int64) (*domain.User, error)
	CreateSession(ctx context.Context, session *domain.UserSession) error
	GetActiveSession(ctx context.Context, tokenHash string) (*domain.UserSession, error)
	RevokeSession(ctx context.Context, tokenHash string) error
	RevokeAllUserSessions(ctx context.Context, userID int64) error
}

// ShiftRepository define las operaciones de persistencia para turnos y caja.
type ShiftRepository interface {
	CreateShift(ctx context.Context, shift *domain.Shift) (*domain.Shift, error)
	GetShiftByID(ctx context.Context, id int64) (*domain.Shift, error)
	GetActiveShiftByUserID(ctx context.Context, userID int64) (*domain.Shift, error)
	UpdateShift(ctx context.Context, shift *domain.Shift) (*domain.Shift, error)
	AddShiftTransaction(ctx context.Context, tx *domain.ShiftTransaction) error
}

// InventoryRepository define las operaciones de persistencia para inventario.
type InventoryRepository interface {
	GetProductByID(ctx context.Context, id int64) (*domain.Product, error)
	UpdateProductStock(ctx context.Context, id int64, newStock int) error
}

// RoomRepository define las operaciones de persistencia para habitaciones.
type RoomRepository interface {
	UpdateRoomStatus(ctx context.Context, id string, status string, notes string) error
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

	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("error al conectar con PostgreSQL (ping falló): %w", err)
	}

	return pool, nil
}


// ReservationRepository define las operaciones de persistencia para reservaciones.
type ReservationRepository interface {
	CreateReservation(ctx context.Context, res *domain.Reservation) error
	UpdateReservation(ctx context.Context, id string, update *domain.UpdateReservationInput) error
	UpdateReservationStatus(ctx context.Context, id string, status domain.ReservationStatus) error
	GetReservationsByDateRange(ctx context.Context, start, end string) ([]*domain.Reservation, error)
}
