package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Arle124/HospedaSync/internal/domain"
	"github.com/Arle124/HospedaSync/internal/service"
)

type mockReservationRepository struct {
	reservations map[string]*domain.Reservation
}

func newMockReservationRepository() *mockReservationRepository {
	return &mockReservationRepository{
		reservations: make(map[string]*domain.Reservation),
	}
}

func (m *mockReservationRepository) CreateReservation(_ context.Context, res *domain.Reservation) error {
	if _, exists := m.reservations[res.ID]; exists {
		return errors.New("reserva ya existe")
	}
	res.CreatedAt = time.Now().UTC()
	res.UpdatedAt = time.Now().UTC()
	m.reservations[res.ID] = res
	return nil
}

func (m *mockReservationRepository) UpdateReservation(_ context.Context, id string, update *domain.UpdateReservationInput) error {
	res, exists := m.reservations[id]
	if !exists {
		return domain.ErrNotFound
	}
	if update.RoomID != nil {
		res.RoomID = *update.RoomID
	}
	if update.GuestName != nil {
		res.GuestName = *update.GuestName
	}
	if update.CheckInDate != nil {
		res.CheckInDate = *update.CheckInDate
	}
	if update.CheckOutDate != nil {
		res.CheckOutDate = *update.CheckOutDate
	}
	if update.Status != nil {
		res.Status = *update.Status
	}
	if update.TotalPrice != nil {
		res.TotalPrice = *update.TotalPrice
	}
	if update.AdvancePayment != nil {
		res.AdvancePayment = *update.AdvancePayment
	}
	if update.Notes != nil {
		res.Notes = update.Notes
	}
	res.UpdatedAt = time.Now().UTC()
	return nil
}

func (m *mockReservationRepository) UpdateReservationStatus(ctx context.Context, id string, status domain.ReservationStatus) error {
	return m.UpdateReservation(ctx, id, &domain.UpdateReservationInput{Status: &status})
}

func (m *mockReservationRepository) GetReservationsByDateRange(_ context.Context, start, end string) ([]*domain.Reservation, error) {
	var result []*domain.Reservation
	for _, res := range m.reservations {
		if res.CheckInDate <= end && res.CheckOutDate >= start {
			result = append(result, res)
		}
	}
	return result, nil
}

// Dummy methods to satisfy repository.Repository interface if needed
func (m *mockReservationRepository) CreateShift(context.Context, *domain.Shift) (*domain.Shift, error) { return nil, nil }
func (m *mockReservationRepository) GetShiftByID(context.Context, int64) (*domain.Shift, error) { return nil, nil }
func (m *mockReservationRepository) GetActiveShiftByUserID(context.Context, int64) (*domain.Shift, error) { return nil, nil }
func (m *mockReservationRepository) UpdateShift(context.Context, *domain.Shift) (*domain.Shift, error) { return nil, nil }
func (m *mockReservationRepository) AddShiftTransaction(context.Context, *domain.ShiftTransaction) error { return nil }
func (m *mockReservationRepository) GetProductByID(context.Context, int64) (*domain.Product, error) { return nil, nil }
func (m *mockReservationRepository) UpdateProductStock(context.Context, int64, int) error { return nil }
func (m *mockReservationRepository) UpdateRoomStatus(context.Context, string, string, string) error { return nil }
func (m *mockReservationRepository) GetUserByEmail(context.Context, string) (*domain.User, error) { return nil, nil }
func (m *mockReservationRepository) GetUserByID(context.Context, int64) (*domain.User, error) { return nil, nil }
func (m *mockReservationRepository) CreateSession(context.Context, *domain.UserSession) error { return nil }
func (m *mockReservationRepository) GetActiveSession(context.Context, string) (*domain.UserSession, error) { return nil, nil }
func (m *mockReservationRepository) RevokeSession(context.Context, string) error { return nil }
func (m *mockReservationRepository) RevokeAllUserSessions(context.Context, int64) error { return nil }

func TestReservationService_CreateAndGet(t *testing.T) {
	repo := newMockReservationRepository()
	svc := service.NewReservationService(repo)
	ctx := context.Background()

	res := &domain.Reservation{
		ID:             "res-001",
		RoomID:         "101",
		GuestName:      "Ana Martínez",
		CheckInDate:    "2026-10-15",
		CheckOutDate:   "2026-10-18",
		Status:         domain.ReservationPending,
		Source:         domain.SourceManual,
		TotalPrice:     240000,
		AdvancePayment: 50000,
	}

	if err := svc.CreateReservation(ctx, res); err != nil {
		t.Fatalf("error inesperado al crear reserva: %v", err)
	}

	// Consulta de rango que incluye las fechas
	list, err := svc.GetReservationsByDateRange(ctx, "2026-10-10", "2026-10-20")
	if err != nil {
		t.Fatalf("error al consultar reservas: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("se esperaba 1 reserva, se obtuvieron %d", len(list))
	}
	if list[0].GuestName != "Ana Martínez" {
		t.Errorf("nombre de huésped incorrecto: %s", list[0].GuestName)
	}

	// Consulta de rango que NO incluye las fechas
	listEmpty, err := svc.GetReservationsByDateRange(ctx, "2026-10-01", "2026-10-05")
	if err != nil {
		t.Fatalf("error en consulta de rango fuera: %v", err)
	}
	if len(listEmpty) != 0 {
		t.Errorf("se esperaban 0 reservas, se obtuvieron %d", len(listEmpty))
	}
}

func TestReservationService_UpdateAndStatus(t *testing.T) {
	repo := newMockReservationRepository()
	svc := service.NewReservationService(repo)
	ctx := context.Background()

	res := &domain.Reservation{
		ID:             "res-002",
		RoomID:         "102",
		GuestName:      "Carlos Ruiz",
		CheckInDate:    "2026-10-10",
		CheckOutDate:   "2026-10-12",
		Status:         domain.ReservationPending,
		Source:         domain.SourceManual,
		TotalPrice:     160000,
		AdvancePayment: 0,
	}
	_ = svc.CreateReservation(ctx, res)

	// Actualizar habitación y fechas (simulación drag & drop)
	newRoom := "201"
	newIn := "2026-10-11"
	newOut := "2026-10-13"
	err := svc.UpdateReservation(ctx, "res-002", &domain.UpdateReservationInput{
		RoomID:       &newRoom,
		CheckInDate:  &newIn,
		CheckOutDate: &newOut,
	})
	if err != nil {
		t.Fatalf("error al actualizar reservación: %v", err)
	}

	if repo.reservations["res-002"].RoomID != "201" {
		t.Errorf("habitación esperada 201, obtenida %s", repo.reservations["res-002"].RoomID)
	}
	if repo.reservations["res-002"].CheckInDate != "2026-10-11" {
		t.Errorf("fecha in esperada 2026-10-11, obtenida %s", repo.reservations["res-002"].CheckInDate)
	}

	// Actualizar status a CONFIRMED
	err = svc.UpdateReservationStatus(ctx, "res-002", "CONFIRMED")
	if err != nil {
		t.Fatalf("error al actualizar estado: %v", err)
	}
	if repo.reservations["res-002"].Status != domain.ReservationConfirmed {
		t.Errorf("estado esperado CONFIRMED, obtenido %s", repo.reservations["res-002"].Status)
	}

	// Actualización de id inexistente debe fallar
	err = svc.UpdateReservation(ctx, "res-999", &domain.UpdateReservationInput{})
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("se esperaba ErrNotFound, se obtuvo: %v", err)
	}
}
