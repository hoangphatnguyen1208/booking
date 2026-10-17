package db

import (
	"fmt"

	"booking/src/hotel"
	"booking/src/identity"
	"booking/src/lodging"
	"booking/src/permission"

	"gorm.io/gorm"
)

func Migrate(conn *gorm.DB) error {
	if err := conn.AutoMigrate(
		&hotel.Hotel{},
		&identity.User{},
		&identity.Role{},
		&permission.HotelMember{},
		&lodging.RoomType{},
		&lodging.Inventory{},
		&lodging.Booking{},
		&lodging.BookingNight{},
	); err != nil {
		return fmt.Errorf("auto migrate: %w", err)
	}

	return nil
}
