package main

import (
	_ "booking/docs"
	"log"

	"booking/src/config"
	"booking/src/db"
	"booking/src/identity"
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

	RequireAuth := middleware.RequireAuth(tokens)

	router := gin.Default()
	api := router.Group("/api/v1")
	controller.RegisterRoutes(api, RequireAuth)
	
	swaggerui.RegisterRoutes(router)
	log.Println("Connected to the database successfully:", conn)

	if err := router.Run(":8080"); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}
