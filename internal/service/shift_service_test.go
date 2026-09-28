package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Arle124/HospedaSync/internal/domain"
	"github.com/Arle124/HospedaSync/internal/service"
)

// mockShiftRepository implementa repository.ShiftRepository en memoria para pruebas unitarias.
type mockShiftRepository struct {
	shifts map[int64]*domain.Shift
	nextID int64
}

func newMockShiftRepository() *mockShiftRepository {
	return &mockShiftRepository{
		shifts: make(map[int64]*domain.Shift),
		nextID: 1,
	}
}

func (m *mockShiftRepository) CreateShift(_ context.Context, s *domain.Shift) (*domain.Shift, error) {
	s.ID = m.nextID
	m.nextID++
	m.shifts[s.ID] = s
	return s, nil
}

func (m *mockShiftRepository) GetShiftByID(_ context.Context, id int64) (*domain.Shift, error) {
	shift, exists := m.shifts[id]
	if !exists {
		return nil, domain.ErrNotFound
	}
	return shift, nil
}

func (m *mockShiftRepository) GetActiveShiftByUserID(_ context.Context, userID int64) (*domain.Shift, error) {
	for _, s := range m.shifts {
		if s.UserID == userID && s.Status == domain.ShiftStatusOpen {
			return s, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockShiftRepository) UpdateShift(_ context.Context, s *domain.Shift) (*domain.Shift, error) {
	if _, exists := m.shifts[s.ID]; !exists {
		return nil, domain.ErrNotFound
	}
	m.shifts[s.ID] = s
	return s, nil
}

func TestOpenShift_Success(t *testing.T) {
	repo := newMockShiftRepository()
	svc := service.NewShiftService(repo)
	ctx := context.Background()

	shift, err := svc.OpenShift(ctx, 1, 50000)
	if err != nil {
		t.Fatalf("se esperaba éxito, se obtuvo error: %v", err)
	}

	if shift.ID == 0 {
		t.Errorf("se esperaba un ID asignado mayor a 0")
	}
	if shift.Status != domain.ShiftStatusOpen {
		t.Errorf("se esperaba estado OPEN, se obtuvo: %s", shift.Status)
	}
	if shift.InitialCash != 50000 || shift.CurrentCash != 50000 {
		t.Errorf("montos incorrectos: inicial=%d, actual=%d", shift.InitialCash, shift.CurrentCash)
	}
}

func TestOpenShift_NegativeAmount(t *testing.T) {
	repo := newMockShiftRepository()
	svc := service.NewShiftService(repo)
	ctx := context.Background()

	_, err := svc.OpenShift(ctx, 1, -100)
	if !errors.Is(err, domain.ErrNegativeAmount) {
		t.Errorf("se esperaba ErrNegativeAmount, se obtuvo: %v", err)
	}
}

func TestOpenShift_AlreadyOpen(t *testing.T) {
	repo := newMockShiftRepository()
	svc := service.NewShiftService(repo)
	ctx := context.Background()

	_, err := svc.OpenShift(ctx, 1, 50000)
	if err != nil {
		t.Fatalf("error abriendo primer turno: %v", err)
	}

	// Intento de abrir un segundo turno para el mismo usuario sin cerrar el primero
	_, err = svc.OpenShift(ctx, 1, 20000)
	if !errors.Is(err, domain.ErrShiftAlreadyOpen) {
		t.Errorf("se esperaba ErrShiftAlreadyOpen, se obtuvo: %v", err)
	}
}

func TestCloseShift_Calculations(t *testing.T) {
	tests := []struct {
		name          string
		initialCash   int64
		currentCash   int64
		actualCash    int64
		expectedDiff  int64
	}{
		{
			name:         "Cuadre perfecto (sin diferencia)",
			initialCash:  50000,
			currentCash:  75000,
			actualCash:   75000,
			expectedDiff: 0,
		},
		{
			name:         "Faltante en caja (dinero perdido o no registrado)",
			initialCash:  50000,
			currentCash:  80000,
			actualCash:   70000,
			expectedDiff: -10000,
		},
		{
			name:         "Sobrante en caja (más dinero del esperado)",
			initialCash:  50000,
			currentCash:  50000,
			actualCash:   55000,
			expectedDiff: 5000,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newMockShiftRepository()
			svc := service.NewShiftService(repo)
			ctx := context.Background()

			openShift, err := svc.OpenShift(ctx, 1, tt.initialCash)
			if err != nil {
				t.Fatalf("error abriendo turno: %v", err)
			}

			// Simular transacciones en el turno
			openShift.CurrentCash = tt.currentCash

			closedShift, err := svc.CloseShift(ctx, openShift.ID, tt.actualCash, "Arqueo de prueba")
			if err != nil {
				t.Fatalf("error cerrando turno: %v", err)
			}

			if closedShift.Status != domain.ShiftStatusClosed {
				t.Errorf("se esperaba estado CLOSED, se obtuvo %s", closedShift.Status)
			}
			if closedShift.ActualCash == nil || *closedShift.ActualCash != tt.actualCash {
				t.Errorf("actualCash incorrecto")
			}
			if closedShift.Difference == nil || *closedShift.Difference != tt.expectedDiff {
				t.Errorf("diferencia esperada %d, obtenida %v", tt.expectedDiff, closedShift.Difference)
			}
			if closedShift.EndedAt == nil || closedShift.EndedAt.After(time.Now().UTC().Add(time.Minute)) {
				t.Errorf("fecha de fin no asignada adecuadamente")
			}
		})
	}
}

func TestCloseShift_AlreadyClosed(t *testing.T) {
	repo := newMockShiftRepository()
	svc := service.NewShiftService(repo)
	ctx := context.Background()

	shift, _ := svc.OpenShift(ctx, 1, 50000)
	_, err := svc.CloseShift(ctx, shift.ID, 50000, "Primer cierre")
	if err != nil {
		t.Fatalf("error en primer cierre: %v", err)
	}

	// Segundo cierre debe fallar
	_, err = svc.CloseShift(ctx, shift.ID, 50000, "Segundo cierre inválido")
	if !errors.Is(err, domain.ErrShiftAlreadyClosed) {
		t.Errorf("se esperaba ErrShiftAlreadyClosed, se obtuvo: %v", err)
	}
}

func TestCloseShift_NotFound(t *testing.T) {
	repo := newMockShiftRepository()
	svc := service.NewShiftService(repo)
	ctx := context.Background()

	_, err := svc.CloseShift(ctx, 9999, 10000, "Turno inexistente")
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("se esperaba ErrNotFound, se obtuvo: %v", err)
	}
}
