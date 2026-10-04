package main

import (
	"log"

	"booking/src/config"
	"booking/src/db"
	"booking/src/identity"

	"github.com/gin-gonic/gin"
)

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

	router := gin.Default()
	controller.RegisterRoutes(router)
	log.Println("Connected to the database successfully:", conn)
}
