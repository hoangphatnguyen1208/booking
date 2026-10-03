package db

import (
    "fmt"

    "booking/src/hotel"
	"booking/src/identity"

    "gorm.io/gorm"
)

func Migrate(conn *gorm.DB) error {
    if err := conn.AutoMigrate(
        &hotel.Hotel{},
        &identity.User{},
    ); err != nil {
        return fmt.Errorf("auto migrate: %w", err)
    }

    return nil
}