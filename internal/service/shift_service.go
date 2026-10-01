package service

import (
	"context"
	"time"

	"github.com/Arle124/HospedaSync/internal/domain"
	"github.com/Arle124/HospedaSync/internal/repository"
)

// ShiftService define las operaciones de negocio de turnos y arqueos.
type ShiftService interface {
	OpenShift(ctx context.Context, userID int64, initialCash int64) (*domain.Shift, error)
	CloseShift(ctx context.Context, shiftID int64, actualCash int64, notes string) (*domain.Shift, error)
	GetShift(ctx context.Context, shiftID int64) (*domain.Shift, error)
	AddTransaction(ctx context.Context, shiftID int64, amount int64, txType, concept string) (*domain.ShiftTransaction, error)
}

type shiftService struct {
	repo repository.ShiftRepository
}

// NewShiftService crea una nueva instancia del servicio de turnos.
func NewShiftService(repo repository.ShiftRepository) ShiftService {
	return &shiftService{
		repo: repo,
	}
}

func (s *shiftService) OpenShift(ctx context.Context, userID int64, initialCash int64) (*domain.Shift, error) {
	if initialCash < 0 {
		return nil, domain.ErrNegativeAmount
	}

	// Regla de negocio: Verificar si el usuario ya tiene un turno abierto
	activeShift, err := s.repo.GetActiveShiftByUserID(ctx, userID)
	if err == nil && activeShift != nil {
		return nil, domain.ErrShiftAlreadyOpen
	}

	newShift := &domain.Shift{
		UserID:      userID,
		InitialCash: initialCash,
		CurrentCash: initialCash,
		Status:      domain.ShiftStatusOpen,
		StartedAt:   time.Now().UTC(),
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}

	return s.repo.CreateShift(ctx, newShift)
}

func (s *shiftService) CloseShift(ctx context.Context, shiftID int64, actualCash int64, notes string) (*domain.Shift, error) {
	if actualCash < 0 {
		return nil, domain.ErrNegativeAmount
	}

	shift, err := s.repo.GetShiftByID(ctx, shiftID)
	if err != nil {
		return nil, err
	}
	if shift == nil {
		return nil, domain.ErrNotFound
	}
	if shift.Status == domain.ShiftStatusClosed {
		return nil, domain.ErrShiftAlreadyClosed
	}

	// Regla de negocio: Cuadre de caja (diferencia entre el efectivo reportado y el esperado)
	diff := actualCash - shift.CurrentCash
	now := time.Now().UTC()

	shift.ActualCash = &actualCash
	shift.Difference = &diff
	shift.Status = domain.ShiftStatusClosed
	shift.Notes = notes
	shift.EndedAt = &now
	shift.UpdatedAt = now

	return s.repo.UpdateShift(ctx, shift)
}

func (s *shiftService) GetShift(ctx context.Context, shiftID int64) (*domain.Shift, error) {
	shift, err := s.repo.GetShiftByID(ctx, shiftID)
	if err != nil {
		return nil, err
	}
	if shift == nil {
		return nil, domain.ErrNotFound
	}
	return shift, nil
}

func (s *shiftService) AddTransaction(ctx context.Context, shiftID int64, amount int64, txType, concept string) (*domain.ShiftTransaction, error) {
	shift, err := s.repo.GetShiftByID(ctx, shiftID)
	if err != nil {
		return nil, err
	}
	if shift == nil {
		return nil, domain.ErrNotFound
	}
	if shift.Status == domain.ShiftStatusClosed {
		return nil, domain.ErrShiftAlreadyClosed
	}

	tx := &domain.ShiftTransaction{
		ShiftID:   shiftID,
		Amount:    amount,
		Type:      txType,
		Concept:   concept,
		CreatedAt: time.Now().UTC(),
	}

	if err := s.repo.AddShiftTransaction(ctx, tx); err != nil {
		return nil, err
	}

	// Actualizar el efectivo en caja si es un movimiento en efectivo
	if txType == "INCOME_MINIBAR" || txType == "INCOME_ROOM" || txType == "INCOME_OTHER" {
		shift.CurrentCash += amount
		shift.UpdatedAt = time.Now().UTC()
		_, _ = s.repo.UpdateShift(ctx, shift)
	} else if txType == "EXPENSE_SUPPLIER" || txType == "EXPENSE_OTHER" {
		shift.CurrentCash -= amount
		shift.UpdatedAt = time.Now().UTC()
		_, _ = s.repo.UpdateShift(ctx, shift)
	}

	return tx, nil
}
