package db_test

import (
	"booking/internal/bootstrap"
	"booking/src/db"
	"booking/src/hotel"
	"booking/src/identity"
	"context"
	"crypto/rand"
	"encoding/hex"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"os"
	"strings"
	"testing"
)

func TestLegacyMigrationPreservesHotelAndDoesNotAssignOwner(t *testing.T) {
	for _, variant := range []string{"with_slug", "missing_slug", "minimal_hotel", "missing_country"} {
		t.Run(variant, func(t *testing.T) {
			testLegacyMigration(t, variant)
		})
	}
}

func testLegacyMigration(t *testing.T, variant string) {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	root, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	random := make([]byte, 8)
	if _, err = rand.Read(random); err != nil {
		t.Fatal(err)
	}
	schema := "legacy_" + hex.EncodeToString(random)
	if err = root.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatal(err)
	}
	conn, err := gorm.Open(postgres.Open(dsn+" search_path="+schema), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		p, _ := conn.DB()
		p.Close()
		root.Exec("DROP SCHEMA " + schema + " CASCADE")
		p, _ = root.DB()
		p.Close()
	})
	setup := "CREATE TABLE hotels (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name varchar(100) NOT NULL,slug varchar(100) UNIQUE NOT NULL,address varchar(255),city varchar(100) NOT NULL,country varchar(100) NOT NULL,rank smallint NOT NULL,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());INSERT INTO hotels(name,slug,city,country,rank) VALUES('Legacy hotel','legacy','Hue','VN',3)"
	if variant == "missing_slug" {
		setup = strings.Replace(setup, "slug varchar(100) UNIQUE NOT NULL,", "", 1)
		setup = strings.Replace(setup, "name,slug,city", "name,city", 1)
		setup = strings.Replace(setup, "'Legacy hotel','legacy','Hue'", "'Legacy hotel','Hue'", 1)
	}
	if variant == "missing_country" {
		setup = strings.Replace(setup, "country varchar(100) NOT NULL,", "", 1)
		setup = strings.Replace(setup, "city,country,rank", "city,rank", 1)
		setup = strings.Replace(setup, "'Hue','VN',3", "'Hue',3", 1)
	}
	if variant == "minimal_hotel" {
		setup = "CREATE TABLE hotels (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(100) NOT NULL); INSERT INTO hotels(name) VALUES ('Legacy hotel')"
	}
	if err = conn.Exec(setup).Error; err != nil {
		t.Fatal(err)
	}
	if err = db.Migrate(conn); err != nil {
		t.Fatal(err)
	}
	if err = db.Migrate(conn); err != nil {
		t.Fatal(err)
	}
	var h hotel.Hotel
	if err = conn.First(&h, "name = ?", "Legacy hotel").Error; err != nil {
		t.Fatal(err)
	}
	if h.Name != "Legacy hotel" || h.Amenities == nil {
		t.Fatalf("legacy data lost: %+v", h)
	}
	if (variant == "with_slug" || variant == "missing_country") && h.Slug != "legacy" {
		t.Fatalf("existing slug changed: %q", h.Slug)
	}
	if (variant == "missing_slug" || variant == "minimal_hotel") && h.Slug != "legacy-"+h.ID {
		t.Fatalf("missing legacy slug: %q", h.Slug)
	}
	var count int64
	conn.Table("hotel_members").Count(&count)
	if count != 0 {
		t.Fatal("legacy hotel was claimed without authorization")
	}
	if variant == "minimal_hotel" && (h.City != "" || h.Country != "" || h.Rank != 0) {
		t.Fatalf("missing legacy data should stay unknown: %+v", h)
	}
	if variant != "minimal_hotel" && (h.City != "Hue" || h.Rank != 3) {
		t.Fatalf("existing city/rank changed: %+v", h)
	}
	if variant == "missing_country" && h.Country != "" {
		t.Fatal("country should remain unknown")
	}
	if (variant == "with_slug" || variant == "missing_slug") && h.Country != "VN" {
		t.Fatal("existing country changed")
	}
	// Reproduce the actual failing workflow, not just SELECT from the table.
	owner := identity.User{Email: "legacy-owner@example.test", HashedPassword: "test-only"}
	if err := conn.Create(&owner).Error; err != nil {
		t.Fatal(err)
	}
	seeded, err := bootstrap.Run(context.Background(), conn, bootstrap.Options{OwnerEmail: owner.Email, Hotels: 1, Days: 2, From: "2030-01-01"}, strings.NewReader(""))
	if err != nil {
		t.Fatalf("bootstrap after legacy migration failed: %v", err)
	}
	if seeded.Hotels != 1 || seeded.Rooms != 3 || seeded.Nights != 6 {
		t.Fatalf("incomplete bootstrap: %+v", seeded)
	}
}
