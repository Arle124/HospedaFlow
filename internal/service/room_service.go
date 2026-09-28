package service

import (
	"context"

	"github.com/Arle124/HospedaSync/internal/domain"
	"github.com/Arle124/HospedaSync/internal/repository"
)

// RoomService define las operaciones de negocio para habitaciones.
type RoomService interface {
	UpdateRoomStatus(ctx context.Context, id string, status string, notes string) error
}

type roomService struct {
	repo repository.RoomRepository
}

// NewRoomService crea una nueva instancia del servicio de habitaciones.
func NewRoomService(repo repository.RoomRepository) RoomService {
	return &roomService{
		repo: repo,
	}
}

func (s *roomService) UpdateRoomStatus(ctx context.Context, id string, status string, notes string) error {
	switch domain.RoomStatus(status) {
	case domain.RoomStatusAvailable, domain.RoomStatusOccupied, domain.RoomStatusDirty, domain.RoomStatusCleaning, domain.RoomStatusMaintenance:
		// Valido
	default:
		return domain.ErrInvalidInput
	}

	return s.repo.UpdateRoomStatus(ctx, id, status, notes)
}
