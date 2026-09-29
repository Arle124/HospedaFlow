package handler

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/Arle124/HospedaSync/internal/config"
	customMiddleware "github.com/Arle124/HospedaSync/internal/middleware"
	"github.com/Arle124/HospedaSync/pkg/response"
)

// NewRouter configura y retorna el enrutador HTTP de Chi con middlewares y endpoints.
func NewRouter(cfg *config.Config, authMiddleware func(http.Handler) http.Handler, authHandler *AuthHandler, shiftHandler *ShiftHandler, roomHandler *RoomHandler, reservationHandler *ReservationHandler) http.Handler {
	r := chi.NewRouter()

	allowedOrigins := strings.Split(cfg.CORSOrigins, ",")

	// Middleware de Cabeceras de Seguridad
	r.Use(customMiddleware.SecurityHeaders)

	// Middleware CORS manual (permite orígenes específicos)
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			originAllowed := false
			
			for _, allowed := range allowedOrigins {
				if origin == strings.TrimSpace(allowed) {
					originAllowed = true
					break
				}
			}

			if originAllowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	})

	// Middlewares esenciales
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(middleware.Throttle(100))

	// Health check endpoint
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		response.JSON(w, http.StatusOK, map[string]string{
			"status":  "ok",
			"service": "HospedaSync API",
			"time":    time.Now().UTC().Format(time.RFC3339),
		})
	})

	if authHandler != nil {
		r.With(customMiddleware.RateLimitLogin).Post("/api/auth/login", authHandler.Login)
	}

	// Rutas Protegidas
	r.Group(func(r chi.Router) {
		if authMiddleware != nil {
			r.Use(authMiddleware)
		}

		if authHandler != nil {
			r.Post("/api/auth/logout", authHandler.Logout)
			r.Get("/api/auth/me", authHandler.Me)
		}

		// Rutas API v1
		r.Route("/api/v1", func(r chi.Router) {
			if shiftHandler != nil {
				r.Route("/shifts", func(r chi.Router) {
					r.Post("/", shiftHandler.OpenShift)
					r.Get("/{id}", shiftHandler.GetShift)
					r.Post("/{id}/close", shiftHandler.CloseShift)
				})
			}
			if roomHandler != nil {
				r.Route("/rooms", func(r chi.Router) {
					r.Put("/{id}/status", roomHandler.UpdateRoomStatus)
				})
			}
			if reservationHandler != nil {
				r.Route("/reservations", func(r chi.Router) {
					r.Post("/", reservationHandler.CreateReservation)
					r.Get("/", reservationHandler.GetReservations)
					r.Put("/{id}/status", reservationHandler.UpdateReservationStatus)
				})
			}
		})
	})

	// Servir archivos estáticos del frontend (SPA) si existen
	candidates := []string{"./frontend/dist", "./dist", "../frontend/dist"}
	var distDir string
	for _, dir := range candidates {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			distDir = dir
			break
		}
	}

	if distDir != "" {
		fs := http.FileServer(http.Dir(distDir))
		spaHandler := func(w http.ResponseWriter, r *http.Request) {
			target := filepath.Join(distDir, filepath.Clean(r.URL.Path))
			info, err := os.Stat(target)
			if err == nil && !info.IsDir() {
				fs.ServeHTTP(w, r)
				return
			}
			http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
		}
		r.Get("/*", spaHandler)
		r.Head("/*", spaHandler)
	}

	return r
}
