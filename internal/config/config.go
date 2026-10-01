package config

import (
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
)

// Config almacena las variables de configuración del servidor y base de datos.
type Config struct {
	Port         string
	DatabaseURL  string
	Environment  string
	CORSOrigins  string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	JWTSecret    string
	JWTExpiry    time.Duration
}

// Load carga la configuración leyendo las variables de entorno o asignando valores por defecto.
func Load() *Config {
	_ = godotenv.Load() // Intenta cargar .env, si no existe o falla, continúa usando el entorno actual.

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Println("DATABASE_URL no está configurada")
		dbURL = ""
	}

	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "development"
	}

	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "http://localhost:5173,http://localhost:8080"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "hospedasync-dev-secret-change-in-production"
		log.Println("ADVERTENCIA: JWT_SECRET no configurado, usando valor por defecto de desarrollo")
	}
	jwtExpiry := 12 * time.Hour

	return &Config{
		Port:         port,
		DatabaseURL:  dbURL,
		Environment:  env,
		CORSOrigins:  corsOrigins,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		JWTSecret:    jwtSecret,
		JWTExpiry:    jwtExpiry,
	}
}
