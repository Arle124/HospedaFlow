package config

import (
	"os"
	"time"
)

// Config almacena las variables de configuración del servidor y base de datos.
type Config struct {
	Port         string
	DatabaseURL  string
	Environment  string
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
		dbURL = "postgres://postgres:postgres@localhost:5432/hospedasync?sslmode=disable"
	}

	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "development"
	}

	return &Config{
		Port:         port,
		DatabaseURL:  dbURL,
		Environment:  env,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
}
