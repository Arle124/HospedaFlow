package domain

import "time"

type ReservationStatus string

const (
	ReservationPending   ReservationStatus = "PENDING"
	ReservationConfirmed ReservationStatus = "CONFIRMED"
	ReservationCheckedIn ReservationStatus = "CHECKED_IN"
	ReservationCancelled ReservationStatus = "CANCELLED"
	ReservationNoShow    ReservationStatus = "NO_SHOW"
)

type ReservationSource string

const (
	SourceManual      ReservationSource = "MANUAL"
	SourceExcelImport ReservationSource = "EXCEL_IMPORT"
	SourceBooking     ReservationSource = "BOOKING"
	SourceAirbnb      ReservationSource = "AIRBNB"
)

// Reservation representa la entidad de dominio de una reservación futura.
type Reservation struct {
	ID             string            `json:"id"`
	RoomID         string            `json:"roomId"`
	GuestName      string            `json:"guestName"`
	GuestContact   *string           `json:"guestContact,omitempty"`
	CheckInDate    string            `json:"checkInDate"` // Format: YYYY-MM-DD
	CheckOutDate   string            `json:"checkOutDate"` // Format: YYYY-MM-DD
	Status         ReservationStatus `json:"status"`
	Source         ReservationSource `json:"source"`
	TotalPrice     int64             `json:"totalPrice"`
	AdvancePayment int64             `json:"advancePayment"`
	Notes          *string           `json:"notes,omitempty"`
	ExternalID     *string           `json:"externalId,omitempty"`
	CreatedAt      time.Time         `json:"createdAt"`
	UpdatedAt      time.Time         `json:"updatedAt"`
}
