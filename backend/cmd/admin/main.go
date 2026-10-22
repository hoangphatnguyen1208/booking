package main

import (
	"booking/src/config"
	"booking/src/db"
	"booking/src/identity"
	"booking/src/permission"
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"io"
	"log"
	"os"
	"strings"
)

func main() {
	email := flag.String("email", "", "Registered account to grant admin")
	claim := flag.String("claim-hotel", "", "Optional legacy hotel UUID to assign ownership")
	create := flag.Bool("create", false, "Create missing account using a password read from stdin; existing passwords are unchanged")
	flag.Parse()
	if *email == "" {
		log.Fatal("-email is required")
	}
	conn := db.Connect(config.NewEnv())
	if err := db.Migrate(conn); err != nil {
		log.Fatal(err)
	}
	if err := grantAdmin(conn, *email, *claim, *create, os.Stdin); err != nil {
		log.Fatal(err)
	}
	log.Println("Admin access granted")
}

func grantAdmin(conn *gorm.DB, email, claim string, create bool, input io.Reader) error {
	return conn.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtext(?))", "booking-admin:"+email).Error; err != nil {
			return err
		}
		var user identity.User
		err := tx.First(&user, "email = ?", email).Error
		if errors.Is(err, gorm.ErrRecordNotFound) && create {
			fmt.Fprint(os.Stderr, "New account password (8+ characters, at most 72 bytes): ")
			password, readErr := bufio.NewReader(io.LimitReader(input, 1024)).ReadString('\n')
			fmt.Fprintln(os.Stderr)
			if readErr != nil && !errors.Is(readErr, io.EOF) {
				return readErr
			}
			password = strings.TrimSuffix(strings.TrimSuffix(password, "\n"), "\r")
			created, err := identity.NewService(identity.NewRepository(tx), nil).Register(context.Background(), identity.RegisterRequest{Email: email, Password: password})
			if err != nil {
				return err
			}
			user = *created
		} else if err != nil {
			return err
		}
		role := identity.Role{Name: "admin"}
		if err := tx.Where("name = ?", "admin").FirstOrCreate(&role).Error; err != nil {
			return err
		}
		if err := tx.Exec("INSERT INTO user_roles(user_id,role_id) VALUES (?,?) ON CONFLICT DO NOTHING", user.ID, role.ID).Error; err != nil {
			return err
		}
		if claim != "" {
			return tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "hotel_id"}, {Name: "user_id"}}, DoUpdates: clause.AssignmentColumns([]string{"role"})}).Create(&permission.HotelMember{HotelID: claim, UserID: user.ID, Role: "owner"}).Error
		}
		return nil
	})
}
