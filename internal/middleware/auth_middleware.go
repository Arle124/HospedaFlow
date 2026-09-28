package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/Arle124/HospedaSync/internal/auth"
	"github.com/Arle124/HospedaSync/internal/service"
	"github.com/Arle124/HospedaSync/pkg/response"
)

type contextKey string

const claimsKey contextKey = "claims"

// AuthRequired verifica que la petición contenga un token JWT válido (en cookie o cabecera Authorization).
func AuthRequired(jwtSecret string, authService service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var token string

			// Primero buscamos en la cookie
			cookie, err := r.Cookie("hospedasync_session")
			if err == nil {
				token = cookie.Value
			}

			// Si no hay cookie, buscamos en el header Authorization
			if token == "" {
				authHeader := r.Header.Get("Authorization")
				if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
					token = strings.TrimPrefix(authHeader, "Bearer ")
				}
			}

			if token == "" {
				response.Error(w, http.StatusUnauthorized, "no se proporcionó token de autenticación")
				return
			}

			claims, err := authService.ValidateSession(r.Context(), token, jwtSecret)
			if err != nil {
				// Limpiar cookie si el token es inválido
				http.SetCookie(w, &http.Cookie{
					Name:     "hospedasync_session",
					Value:    "",
					Path:     "/",
					Expires:  time.Unix(0, 0),
					MaxAge:   -1,
					HttpOnly: true,
				})
				response.Error(w, http.StatusUnauthorized, "token inválido o expirado")
				return
			}

			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetClaims extrae los claims del token JWT desde el contexto de la petición.
func GetClaims(ctx context.Context) *auth.Claims {
	claims, ok := ctx.Value(claimsKey).(*auth.Claims)
	if !ok {
		return nil
	}
	return claims
}
