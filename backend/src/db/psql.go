package db

import (
	"fmt"

	"booking/src/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Connect(env *config.Env) *gorm.DB {
	dsn := env.DbStr

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(fmt.Sprintf("failed to connect database: %v", err))
	}
	return db
}


