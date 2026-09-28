package config

import (
	"log"
	"os"
	"time"
)

// Config almacena las variables de configuración del servidor y base de datos.
type Config struct {
	Port         string
	DatabaseURL  string
	Environment  string
	CORSOrigins  string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
}

// Load carga la configuración leyendo las variables de entorno o asignando valores por defecto.
func Load() *Config {
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

	return &Config{
		Port:         port,
		DatabaseURL:  dbURL,
		Environment:  env,
		CORSOrigins:  corsOrigins,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
}
