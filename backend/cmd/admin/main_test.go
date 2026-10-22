package main

import (
	"booking/src/db"
	"booking/src/identity"
	"crypto/rand"
	"fmt"
	"os"
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestCreateAdminAndRerunPreservesPassword(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL is required")
	}
	root, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	key := make([]byte, 8)
	if _, err := rand.Read(key); err != nil {
		t.Fatal(err)
	}
	schema := fmt.Sprintf("admin_%x", key)
	if err := root.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatal(err)
	}
	var conn *gorm.DB
	t.Cleanup(func() {
		if conn != nil {
			pool, _ := conn.DB()
			pool.Close()
		}
		root.Exec("DROP SCHEMA " + schema + " CASCADE")
		pool, _ := root.DB()
		pool.Close()
	})
	conn, err = gorm.Open(postgres.Open(dsn+" search_path="+schema), &gorm.Config{TranslateError: true, Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Migrate(conn); err != nil {
		t.Fatal(err)
	}
	const email = "bootstrap@example.test"
	if err := grantAdmin(conn, email, "", false, strings.NewReader("password123\n")); err == nil {
		t.Fatal("missing account accepted without -create")
	}
	if err := grantAdmin(conn, email, "", true, strings.NewReader("short\n")); err == nil {
		t.Fatal("short password accepted")
	}
	var count int64
	conn.Model(&identity.User{}).Count(&count)
	if count != 0 {
		t.Fatal("failed registration was not rolled back")
	}
	if err := grantAdmin(conn, email, "", true, strings.NewReader("password123\n")); err != nil {
		t.Fatal(err)
	}
	var user identity.User
	if err := conn.Preload("Roles").Where("email = ?", email).First(&user).Error; err != nil {
		t.Fatal(err)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.HashedPassword), []byte("password123")); err != nil {
		t.Fatal("password was not hashed correctly")
	}
	if len(user.Roles) != 1 || user.Roles[0].Name != "admin" {
		t.Fatalf("unexpected roles: %+v", user.Roles)
	}
	originalHash := user.HashedPassword
	if err := grantAdmin(conn, email, "", true, strings.NewReader("different-password\n")); err != nil {
		t.Fatal(err)
	}
	if err := conn.Preload("Roles").Where("email = ?", email).First(&user).Error; err != nil {
		t.Fatal(err)
	}
	if user.HashedPassword != originalHash || len(user.Roles) != 1 {
		t.Fatal("rerun changed password or duplicated admin role")
	}
}
