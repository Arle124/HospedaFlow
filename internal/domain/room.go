package domain

import "time"

// RoomStatus representa el estado operativo de una habitación.
type RoomStatus string

const (
	RoomStatusAvailable   RoomStatus = "available"
	RoomStatusOccupied    RoomStatus = "occupied"
	RoomStatusDirty       RoomStatus = "dirty"
	RoomStatusCleaning    RoomStatus = "cleaning"
	RoomStatusMaintenance RoomStatus = "maintenance"
)

// Room representa la entidad de dominio de una habitación.
type Room struct {
	ID        string     `json:"id"`
	Number    string     `json:"number"`
	Floor     int        `json:"floor"`
	Type      string     `json:"type"`
	Status    RoomStatus `json:"status"`
	Notes     string     `json:"notes,omitempty"`
	UpdatedAt time.Time  `json:"updated_at"`
}
