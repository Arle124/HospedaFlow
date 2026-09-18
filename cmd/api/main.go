package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Arle124/HospedaSync/internal/config"
	"github.com/Arle124/HospedaSync/internal/handler"
)

func main() {
	// Carga de configuración base
	cfg := config.Load()

	// Inicialización del enrutador Chi
	// Nota: Para este arranque base no inyectamos aún la conexión a BD ni dependencias concretas
	r := handler.NewRouter(nil)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  60 * time.Second,
	}

	// Canal para escuchar señales de terminación del sistema (Graceful Shutdown)
	shutdownError := make(chan error)
	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		s := <-quit

		log.Printf("Señal de apagado recibida: %s. Iniciando graceful shutdown...", s.String())

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		shutdownError <- server.Shutdown(ctx)
	}()

	log.Printf("Iniciando servidor HospedaSync en el puerto %s [Entorno: %s]", cfg.Port, cfg.Environment)
	log.Printf("Endpoint de salud disponible en http://localhost:%s/healthz", cfg.Port)

	err := server.ListenAndServe()
	if !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("Error crítico en el servidor HTTP: %v", err)
	}

	err = <-shutdownError
	if err != nil {
		log.Fatalf("Error durante el cierre del servidor: %v", err)
	}

	log.Println("Servidor detenido correctamente.")
}
