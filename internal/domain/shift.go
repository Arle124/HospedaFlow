package domain

import (
	"time"
)

// ShiftStatus representa el estado operativo de un turno.
type ShiftStatus string

const (
	ShiftStatusOpen   ShiftStatus = "OPEN"
	ShiftStatusClosed ShiftStatus = "CLOSED"
)

// Shift representa la entidad de dominio de un turno en HospedaSync.
type Shift struct {
	ID          int64       `json:"id"`
	UserID      int64       `json:"user_id"`
	InitialCash int64     `json:"initial_cash"`
	CurrentCash int64       `json:"current_cash"`  // Monto en pesos (sin decimales)
	ActualCash  *int64    `json:"actual_cash,omitempty"`
	Difference  *int64    `json:"difference,omitempty"`
	Status      ShiftStatus `json:"status"`
	Notes       string      `json:"notes,omitempty"`
	StartedAt   time.Time   `json:"started_at"`
	EndedAt     *time.Time  `json:"ended_at,omitempty"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

// ShiftTransaction representa una transacción económica registrada dentro de un turno de caja.
type ShiftTransaction struct {
	ID        int64     `json:"id"`
	ShiftID   int64     `json:"shift_id"`
	Amount    int64     `json:"amount"` // Monto en pesos COP
	Type      string    `json:"type"`   // INCOME_MINIBAR, EXPENSE_SUPPLIER, etc.
	Concept   string    `json:"concept"`
	CreatedAt time.Time `json:"created_at"`
}
