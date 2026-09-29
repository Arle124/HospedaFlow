package service

import (
	"context"

	"github.com/Arle124/HospedaSync/internal/domain"
	"github.com/Arle124/HospedaSync/internal/repository"
)

type ReservationService interface {
	CreateReservation(ctx context.Context, res *domain.Reservation) error
	UpdateReservationStatus(ctx context.Context, id string, status string) error
	GetReservationsByDateRange(ctx context.Context, start, end string) ([]*domain.Reservation, error)
}

type reservationService struct {
	repo repository.Repository
}

func NewReservationService(repo repository.Repository) ReservationService {
	return &reservationService{repo: repo}
}

func (s *reservationService) CreateReservation(ctx context.Context, res *domain.Reservation) error {
	// Add business logic/validation if needed
	return s.repo.CreateReservation(ctx, res)
}

func (s *reservationService) UpdateReservationStatus(ctx context.Context, id string, status string) error {
	return s.repo.UpdateReservationStatus(ctx, id, domain.ReservationStatus(status))
}

func (s *reservationService) GetReservationsByDateRange(ctx context.Context, start, end string) ([]*domain.Reservation, error) {
	return s.repo.GetReservationsByDateRange(ctx, start, end)
}
