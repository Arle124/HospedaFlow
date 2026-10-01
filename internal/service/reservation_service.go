package service

import (
	"context"

	"github.com/Arle124/HospedaSync/internal/domain"
	"github.com/Arle124/HospedaSync/internal/repository"
)

type ReservationService interface {
	CreateReservation(ctx context.Context, res *domain.Reservation) error
	UpdateReservation(ctx context.Context, id string, update *domain.UpdateReservationInput) error
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

func (s *reservationService) UpdateReservation(ctx context.Context, id string, update *domain.UpdateReservationInput) error {
	return s.repo.UpdateReservation(ctx, id, update)
}

func (s *reservationService) UpdateReservationStatus(ctx context.Context, id string, status string) error {
	st := domain.ReservationStatus(status)
	return s.repo.UpdateReservation(ctx, id, &domain.UpdateReservationInput{
		Status: &st,
	})
}

func (s *reservationService) GetReservationsByDateRange(ctx context.Context, start, end string) ([]*domain.Reservation, error) {
	return s.repo.GetReservationsByDateRange(ctx, start, end)
}
