package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/Arle124/HospedaSync/pkg/response"
)

type client struct {
	attempts int
	lastSeen time.Time
}

var (
	clients sync.Map
)

func init() {
	go func() {
		for {
			time.Sleep(1 * time.Minute)
			now := time.Now()
			clients.Range(func(key, value interface{}) bool {
				c := value.(*client)
				if now.Sub(c.lastSeen) > 15*time.Minute {
					clients.Delete(key)
				}
				return true
			})
		}
	}()
}

// RateLimitLogin limita el número de intentos de login por IP.
func RateLimitLogin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}

		v, _ := clients.LoadOrStore(ip, &client{attempts: 0, lastSeen: time.Now()})
		c := v.(*client)
		c.lastSeen = time.Now()

		if c.attempts >= 15 {
			response.Error(w, http.StatusTooManyRequests, "demasiados intentos, intente más tarde")
			return
		}

		c.attempts++
		next.ServeHTTP(w, r)
	})
}
