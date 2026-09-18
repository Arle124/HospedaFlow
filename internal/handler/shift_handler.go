package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/Arle124/HospedaSync/internal/domain"
	"github.com/Arle124/HospedaSync/internal/service"
	"github.com/Arle124/HospedaSync/pkg/response"
)

// ShiftHandler maneja el transporte HTTP para las operaciones de turnos.
type ShiftHandler struct {
	shiftService service.ShiftService
}

// NewShiftHandler crea una nueva instancia del handler de turnos.
func NewShiftHandler(shiftService service.ShiftService) *ShiftHandler {
	return &ShiftHandler{
		shiftService: shiftService,
	}
}

type openShiftRequest struct {
	UserID      int64   `json:"user_id"`
	InitialCash float64 `json:"initial_cash"`
}

type closeShiftRequest struct {
	ActualCash float64 `json:"actual_cash"`
	Notes      string  `json:"notes"`
}

// OpenShift maneja la apertura de un nuevo turno.
func (h *ShiftHandler) OpenShift(w http.ResponseWriter, r *http.Request) {
	var req openShiftRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	shift, err := h.shiftService.OpenShift(r.Context(), req.UserID, req.InitialCash)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrShiftAlreadyOpen):
			response.Error(w, http.StatusConflict, err.Error())
		case errors.Is(err, domain.ErrNegativeAmount):
			response.Error(w, http.StatusBadRequest, err.Error())
		default:
			response.Error(w, http.StatusInternalServerError, "error al abrir el turno")
		}
		return
	}

	response.JSON(w, http.StatusCreated, shift)
}

// CloseShift maneja el cierre de turno y cuadre de caja.
func (h *ShiftHandler) CloseShift(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	shiftID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "id de turno inválido")
		return
	}

	var req closeShiftRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	shift, err := h.shiftService.CloseShift(r.Context(), shiftID, req.ActualCash, req.Notes)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrNotFound):
			response.Error(w, http.StatusNotFound, err.Error())
		case errors.Is(err, domain.ErrShiftAlreadyClosed):
			response.Error(w, http.StatusConflict, err.Error())
		case errors.Is(err, domain.ErrNegativeAmount):
			response.Error(w, http.StatusBadRequest, err.Error())
		default:
			response.Error(w, http.StatusInternalServerError, "error al cerrar el turno")
		}
		return
	}

	response.JSON(w, http.StatusOK, shift)
}

// GetShift consulta la información de un turno por su ID.
func (h *ShiftHandler) GetShift(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	shiftID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "id de turno inválido")
		return
	}

	shift, err := h.shiftService.GetShift(r.Context(), shiftID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			response.Error(w, http.StatusNotFound, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "error al obtener el turno")
		return
	}

	response.JSON(w, http.StatusOK, shift)
}
