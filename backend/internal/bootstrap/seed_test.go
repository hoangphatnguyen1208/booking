package bootstrap

import (
	"booking/src/db"
	"booking/src/hotel"
	"booking/src/identity"
	"booking/src/lodging"
	"booking/src/permission"
	"context"
	"crypto/rand"
	"fmt"
	"os"
	"strings"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestSeedIsAtomicAndPreservesExistingInventory(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL is required")
	}
	root, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	schema := fmt.Sprintf("seed_%x", randomBytes(t))
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
	owner := identity.User{Email: "seed-owner@example.test", HashedPassword: "test-only"}
	if err := conn.Create(&owner).Error; err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	in := Options{OwnerEmail: owner.Email, Hotels: 2, Days: 3, From: "2030-01-01"}
	missing := in
	missing.OwnerEmail = "missing@example.test"
	if _, err := Seed(ctx, conn, missing); err == nil {
		t.Fatal("missing owner accepted")
	}
	out, err := Seed(ctx, conn, in)
	if err != nil {
		t.Fatal(err)
	}
	if out != (Result{Hotels: 2, Rooms: 6, Nights: 18}) {
		t.Fatalf("unexpected Result: %+v", out)
	}
	var count int64
	conn.Model(&permission.HotelMember{}).Where("user_id = ? AND role = 'owner'", owner.ID).Count(&count)
	if count != 2 {
		t.Fatalf("owner memberships: %d", count)
	}
	var room lodging.RoomType
	if err := conn.First(&room).Error; err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(room.ImageURL, "https://images.unsplash.com/") {
		t.Fatal("seeded room has no sample photo")
	}
	available, err := lodging.New(conn).Availability(ctx, room.HotelID, "2030-01-01", "2030-01-03", 1, 2)
	if err != nil || len(available) != 3 {
		t.Fatalf("availability: %v, %+v", err, available)
	}
	if err := conn.Model(&lodging.Inventory{}).Where("room_type_id = ?", room.ID).Update("reserved", 1).Error; err != nil {
		t.Fatal(err)
	}
	out, err = Seed(ctx, conn, in)
	if err != nil || out != (Result{Skipped: 2}) {
		t.Fatalf("rerun: %+v %v", out, err)
	}
	conn.Model(&lodging.Inventory{}).Count(&count)
	if count != 18 {
		t.Fatalf("duplicate inventory: %d", count)
	}
	conn.Model(&lodging.Inventory{}).Where("room_type_id = ? AND reserved = 1", room.ID).Count(&count)
	if count != 3 {
		t.Fatal("rerun modified reservations")
	}
	// A failure after creating a hotel and room must roll back the whole run.
	if err := conn.Exec("ALTER TABLE inventories ADD CONSTRAINT seed_failure CHECK (price < 1) NOT VALID").Error; err != nil {
		t.Fatal(err)
	}
	in.Hotels = 3
	if _, err := Seed(ctx, conn, in); err == nil {
		t.Fatal("expected inventory insert failure")
	}
	conn.Model(&hotel.Hotel{}).Count(&count)
	if count != 2 {
		t.Fatalf("partial hotel was not rolled back: %d", count)
	}
	conn.Model(&lodging.RoomType{}).Count(&count)
	if count != 6 {
		t.Fatalf("partial room was not rolled back: %d", count)
	}
	// Bootstrap must roll back the new admin as well if hotel import fails.
	in.OwnerEmail = "new-bootstrap@example.test"
	if _, err := Run(ctx, conn, in, strings.NewReader("password123\n")); err == nil {
		t.Fatal("bootstrap should fail when inventory insert fails")
	}
	conn.Model(&identity.User{}).Where("email = ?", in.OwnerEmail).Count(&count)
	if count != 0 {
		t.Fatal("bootstrap left an admin account after failure")
	}
	if err := conn.Exec("ALTER TABLE inventories DROP CONSTRAINT seed_failure").Error; err != nil {
		t.Fatal(err)
	}
	out, err = Run(ctx, conn, in, strings.NewReader("password123\n"))
	if err != nil || out != (Result{Hotels: 1, Rooms: 3, Nights: 9, Skipped: 2}) {
		t.Fatalf("bootstrap: %+v %v", out, err)
	}
	var admin identity.User
	if err := conn.Preload("Roles").Where("email = ?", in.OwnerEmail).First(&admin).Error; err != nil {
		t.Fatal(err)
	}
	if len(admin.Roles) != 1 || admin.Roles[0].Name != "admin" {
		t.Fatal("bootstrap did not grant admin")
	}
	conn.Model(&permission.HotelMember{}).Where("user_id = ? AND role = 'owner'", admin.ID).Count(&count)
	if count != 1 {
		t.Fatal("bootstrap did not assign the imported hotel owner")
	}
}

func randomBytes(t *testing.T) []byte {
	t.Helper()
	key := make([]byte, 8)
	if _, err := rand.Read(key); err != nil {
		t.Fatal(err)
	}
	return key
}
