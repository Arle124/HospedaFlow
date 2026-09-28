package auth

import "golang.org/x/crypto/bcrypt"

const bcryptCost = 10

// HashPassword genera un hash bcrypt para una contraseña dada.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	return string(bytes), err
}

// CheckPassword compara una contraseña en texto plano con un hash bcrypt.
func CheckPassword(password, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
