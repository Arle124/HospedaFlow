package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GenerateToken genera un nuevo token JWT para un usuario.
func GenerateToken(userID int64, role string, secret string, expiry time.Duration) (string, error) {
	tokenIDBytes := (make([]byte, 16))
	if _, err := rand.Read(tokenIDBytes); err != nil {
		return "", err
	}
	tokenID := hex.EncodeToString(tokenIDBytes)

	now := time.Now()
	claims := &Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ID:        tokenID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateToken parsea y valida un token JWT, devolviendo sus claims si es válido.
func ValidateToken(tokenString string, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("método de firma inesperado: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("token inválido")
}

// HashToken genera un hash SHA-256 del token para guardarlo en BD y buscar la sesión de forma segura.
func HashToken(tokenString string) string {
	hash := sha256.Sum256([]byte(tokenString))
	return hex.EncodeToString(hash[:])
}
