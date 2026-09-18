package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/Arle124/HospedaSync/pkg/response"
)

// NewRouter configura y retorna el enrutador HTTP de Chi con middlewares y endpoints.
func NewRouter(shiftHandler *ShiftHandler) http.Handler {
	r := chi.NewRouter()

	// Middlewares esenciales
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))

	// Health check endpoint
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		response.JSON(w, http.StatusOK, map[string]string{
			"status":  "ok",
			"service": "HospedaSync API",
			"time":    time.Now().UTC().Format(time.RFC3339),
		})
	})

	// Rutas API v1
	r.Route("/api/v1", func(r chi.Router) {
		if shiftHandler != nil {
			r.Route("/shifts", func(r chi.Router) {
				r.Post("/", shiftHandler.OpenShift)
				r.Get("/{id}", shiftHandler.GetShift)
				r.Post("/{id}/close", shiftHandler.CloseShift)
			})
		}
	})

	return r
}
