package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/Arle124/HospedaSync/internal/domain"
	"github.com/Arle124/HospedaSync/internal/service"
	"github.com/Arle124/HospedaSync/pkg/response"
)

// RoomHandler maneja el transporte HTTP para las operaciones de habitaciones.
type RoomHandler struct {
	roomService service.RoomService
}

// NewRoomHandler crea una nueva instancia del handler de habitaciones.
func NewRoomHandler(roomService service.RoomService) *RoomHandler {
	return &RoomHandler{
		roomService: roomService,
	}
}

type updateRoomStatusRequest struct {
	Status string `json:"status"`
	Notes  string `json:"notes,omitempty"`
}

// UpdateRoomStatus maneja la actualización del estado de una habitación.
func (h *RoomHandler) UpdateRoomStatus(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	if idParam == "" {
		response.Error(w, http.StatusBadRequest, "id de habitación requerido")
		return
	}

	var req updateRoomStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	if req.Status == "" {
		response.Error(w, http.StatusBadRequest, "el estado es requerido")
		return
	}

	err := h.roomService.UpdateRoomStatus(r.Context(), idParam, req.Status, req.Notes)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrNotFound):
			response.Error(w, http.StatusNotFound, err.Error())
		case errors.Is(err, domain.ErrInvalidInput):
			response.Error(w, http.StatusBadRequest, err.Error())
		default:
			response.Error(w, http.StatusInternalServerError, "error al actualizar estado de habitación")
		}
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "estado actualizado"})
}
