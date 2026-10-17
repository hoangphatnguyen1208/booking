package main

import (
	_ "booking/docs"
	"context"
	"errors"
	"log"
	"net/http"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"booking/src/config"
	"booking/src/db"
	"booking/src/hotel"
	"booking/src/identity"
	"booking/src/lodging"
	"booking/src/middleware"
	"booking/src/swaggerui"

	"github.com/gin-gonic/gin"
)

// @title Booking API
// @version 1.0
// @description Hotel booking API.
// @BasePath /api/v1
// @securityDefinitions.oauth2.password OAuth2Password
// @tokenUrl /api/v1/auth/token
// @description Use your email as username. Client ID and client secret can be left empty.
func main() {
	env := config.NewEnv()
	conn := db.Connect(env)

	sqlDB, err := conn.DB()
	if err != nil {
		log.Fatalf("failed to get database instance: %v", err)
	}
	defer sqlDB.Close()

	if err := db.Migrate(conn); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	tokens := identity.NewTokenManager(env.JwtSecret, env.JwtExpiresTime)

	repo := identity.NewRepository(conn)

	service := identity.NewService(repo, tokens)

	controller := identity.NewController(service)

	RequireAuth := middleware.RequireAuth(tokens, repo)

	router := gin.Default()
	_ = router.SetTrustedProxies(nil)
	if env.TrustedProxies != "" {
		if err := router.SetTrustedProxies(strings.Split(env.TrustedProxies, ",")); err != nil {
			log.Fatal("Invalid TRUSTED_PROXIES")
		}
	}
	router.Use(middleware.BodyLimit(), middleware.AuthLimit())
	router.Use(middleware.Audit(conn))
	router.GET("/healthz", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })
	router.GET("/readyz", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if sqlDB.PingContext(ctx) != nil {
			c.JSON(503, gin.H{"status": "unavailable"})
			return
		}
		c.JSON(200, gin.H{"status": "ready"})
	})
	api := router.Group("/api/v1")
	controller.RegisterRoutes(api, RequireAuth)
	hotel.NewCController(hotel.NewService(hotel.NewRepository(conn))).RegisterRoutes(api, RequireAuth)
	lodging.New(conn).RegisterRoutes(api, RequireAuth)

	swaggerui.RegisterRoutes(router)
	log.Println("Database ready")

	server := &http.Server{Addr: env.ServerAddr, Handler: router, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 20 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	go func() {
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()
	<-ctx.Done()
	shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(shutdown)
}
