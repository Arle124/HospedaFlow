package domain

import "time"

// Product representa un ítem o producto en el inventario del hotel.
type Product struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	SKU       string    `json:"sku"`
	Price     float64   `json:"price"`
	Stock     int       `json:"stock"`
	MinStock  int       `json:"min_stock"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
