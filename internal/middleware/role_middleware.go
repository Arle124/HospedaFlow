package middleware

import (
	"net/http"

	"github.com/Arle124/HospedaSync/pkg/response"
)

// RequireRole verifica que el usuario autenticado posea uno de los roles permitidos.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r.Context())
			if claims == nil {
				response.Error(w, http.StatusUnauthorized, "no autorizado")
				return
			}

			allowed := false
			for _, role := range roles {
				if claims.Role == role {
					allowed = true
					break
				}
			}

			if !allowed {
				response.Error(w, http.StatusForbidden, "no tiene permisos suficientes")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
