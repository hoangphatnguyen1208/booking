package main

import (
	"booking/src/config"
	"booking/src/db"
	"booking/src/identity"
	"booking/src/permission"
	"flag"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"log"
)

func main() {
	email := flag.String("email", "", "Registered account to grant admin")
	claim := flag.String("claim-hotel", "", "Optional legacy hotel UUID to assign ownership")
	flag.Parse()
	if *email == "" {
		log.Fatal("-email is required")
	}
	conn := db.Connect(config.NewEnv())
	if err := db.Migrate(conn); err != nil {
		log.Fatal(err)
	}
	err := conn.Transaction(func(tx *gorm.DB) error {
		var user identity.User
		if err := tx.First(&user, "email = ?", *email).Error; err != nil {
			return err
		}
		role := identity.Role{Name: "admin"}
		if err := tx.Where("name = ?", "admin").FirstOrCreate(&role).Error; err != nil {
			return err
		}
		if err := tx.Exec("INSERT INTO user_roles(user_id,role_id) VALUES (?,?) ON CONFLICT DO NOTHING", user.ID, role.ID).Error; err != nil {
			return err
		}
		if *claim != "" {
			return tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "hotel_id"}, {Name: "user_id"}}, DoUpdates: clause.AssignmentColumns([]string{"role"})}).Create(&permission.HotelMember{HotelID: *claim, UserID: user.ID, Role: "owner"}).Error
		}
		return nil
	})
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Admin access granted")
}
