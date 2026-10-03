package main

import (
	"log"

	"booking/src/config"
	"booking/src/db"
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

	log.Println("Connected to the database successfully:", conn)
}
