// ФУДГРАМ API — Go 1.27 + PostgreSQL (pgx/v5).
//
//	FOODGRAM_DB=postgres://foodgram:foodgram@localhost:5432/foodgram?sslmode=disable
//	FOODGRAM_JWT_SECRET=change-me
//	FOODGRAM_PORT=8000
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/foodgram/backend/internal/api"
	"github.com/foodgram/backend/internal/store"
)

func main() {
	log := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	dsn := envOr("FOODGRAM_DB", "postgres://foodgram:foodgram@localhost:5432/foodgram?sslmode=disable")
	secret := envOr("FOODGRAM_JWT_SECRET", "dev-secret-change-me")
	port := envOr("FOODGRAM_PORT", "8000")

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	st, err := store.New(ctx, dsn)
	if err != nil {
		log.Error("db connect", "err", err)
		os.Exit(1)
	}
	defer st.Close()

	if err := st.Migrate(ctx); err != nil {
		log.Error("migrate", "err", err)
		os.Exit(1)
	}
	log.Info("migrations applied")

	srv := api.NewServer(st, secret, log)
	httpServer := &http.Server{
		Addr:              ":" + port,
		Handler:           srv.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Info("foodgram api listening", "addr", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("serve", "err", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Error("shutdown", "err", err)
	}
	log.Info("bye")
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
