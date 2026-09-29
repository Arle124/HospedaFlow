package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/Arle124/HospedaSync/internal/domain"
	"github.com/Arle124/HospedaSync/internal/service"
	"github.com/Arle124/HospedaSync/pkg/response"
)

type ReservationHandler struct {
	reservationService service.ReservationService
}

func NewReservationHandler(svc service.ReservationService) *ReservationHandler {
	return &ReservationHandler{reservationService: svc}
}

func (h *ReservationHandler) CreateReservation(w http.ResponseWriter, r *http.Request) {
	var res domain.Reservation
	if err := json.NewDecoder(r.Body).Decode(&res); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload inválido")
		return
	}

	if err := h.reservationService.CreateReservation(r.Context(), &res); err != nil {
		response.Error(w, http.StatusInternalServerError, "Error al crear reservación")
		return
	}

	response.JSON(w, http.StatusCreated, res)
}

func (h *ReservationHandler) UpdateReservationStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	
	var payload struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload inválido")
		return
	}

	if err := h.reservationService.UpdateReservationStatus(r.Context(), id, payload.Status); err != nil {
		if err == domain.ErrNotFound {
			response.Error(w, http.StatusNotFound, "Reservación no encontrada")
			return
		}
		response.Error(w, http.StatusInternalServerError, "Error al actualizar reservación")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Estado actualizado"})
}

func (h *ReservationHandler) GetReservations(w http.ResponseWriter, r *http.Request) {
	start := r.URL.Query().Get("start")
	end := r.URL.Query().Get("end")
	
	if start == "" || end == "" {
		response.Error(w, http.StatusBadRequest, "Se requieren parámetros start y end")
		return
	}

	reservations, err := h.reservationService.GetReservationsByDateRange(r.Context(), start, end)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Error al obtener reservaciones")
		return
	}

	response.JSON(w, http.StatusOK, reservations)
}
