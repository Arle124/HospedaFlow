package domain

import "time"

// User representa a un usuario del sistema HospedaSync.
type User struct {
	ID           int64     `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // Never serialize
	Role         string    `json:"role"`
	Active       bool      `json:"active"`
	CreatedAt    time.Time `json:"created_at"`
}

// UserSession representa una sesión de usuario en base de datos para la invalidación de tokens.
type UserSession struct {
	ID        int64      `json:"id"`
	UserID    int64      `json:"user_id"`
	TokenHash string     `json:"-"`
	IPAddress string     `json:"-"`
	UserAgent string     `json:"-"`
	ExpiresAt time.Time  `json:"expires_at"`
	RevokedAt *time.Time `json:"revoked_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}
