package response

import (
	"encoding/json"
	"net/http"
)

// StandardResponse define la estructura uniforme de respuesta de la API.
type StandardResponse struct {
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

// JSON envía una respuesta en formato JSON con el código de estado indicado.
func JSON(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)

	resp := StandardResponse{
		Success: statusCode >= 200 && statusCode < 300,
		Data:    data,
	}

	_ = json.NewEncoder(w).Encode(resp)
}

// Error envía una respuesta de error estandarizada en formato JSON.
func Error(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)

	resp := StandardResponse{
		Success: false,
		Error:   message,
	}

	_ = json.NewEncoder(w).Encode(resp)
}
