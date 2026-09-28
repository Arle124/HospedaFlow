package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Arle124/HospedaSync/internal/config"
	"github.com/Arle124/HospedaSync/internal/domain"
	"github.com/Arle124/HospedaSync/internal/middleware"
	"github.com/Arle124/HospedaSync/internal/service"
	"github.com/Arle124/HospedaSync/pkg/response"
)

// AuthHandler maneja las peticiones HTTP relacionadas con la autenticación.
type AuthHandler struct {
	authService service.AuthService
	cfg         *config.Config
}

// NewAuthHandler crea una nueva instancia de AuthHandler.
func NewAuthHandler(authService service.AuthService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		cfg:         cfg,
	}
}

// LoginRequest define el payload para iniciar sesión.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login autentica a un usuario y establece la cookie de sesión.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, domain.ErrInvalidInput.Error())
		return
	}

	ipAddress := r.RemoteAddr
	userAgent := r.UserAgent()

	token, user, err := h.authService.Login(r.Context(), req.Email, req.Password, ipAddress, userAgent)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "credenciales inválidas")
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "hospedasync_session",
		Value:    token,
		Path:     "/",
		MaxAge:   int(h.cfg.JWTExpiry.Seconds()),
		HttpOnly: true,
		Secure:   h.cfg.Environment == "production",
		SameSite: http.SameSiteLaxMode,
	})

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"user": user,
	})
}

// Logout cierra la sesión del usuario.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("hospedasync_session")
	if err == nil {
		h.authService.Logout(r.Context(), cookie.Value)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "hospedasync_session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "sesión finalizada",
	})
}

// Me retorna la información del usuario autenticado.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		response.Error(w, http.StatusUnauthorized, "no autorizado")
		return
	}

	user, err := h.authService.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "usuario no encontrado")
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"user": user,
	})
}
