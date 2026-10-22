package main

import (
	"booking/internal/bootstrap"
	"booking/src/config"
	"booking/src/db"
	"flag"
	"log"
	"os"
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
	if err := bootstrap.GrantAdmin(conn, *email, *claim, *create, os.Stdin); err != nil {
		log.Fatal(err)
	}
	log.Println("Admin access granted")
}
