package db_test

import (
	"booking/src/db"
	"booking/src/hotel"
	"crypto/rand"
	"encoding/hex"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"os"
	"testing"
)

func TestLegacyMigrationPreservesHotelAndDoesNotAssignOwner(t *testing.T) {
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
	if err = conn.Exec("CREATE TABLE hotels (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name varchar(100) NOT NULL,slug varchar(100) UNIQUE NOT NULL,address varchar(255),city varchar(100) NOT NULL,country varchar(100) NOT NULL,rank smallint NOT NULL,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());INSERT INTO hotels(name,slug,city,country,rank) VALUES('Legacy hotel','legacy','Hue','VN',3)").Error; err != nil {
		t.Fatal(err)
	}
	if err = db.Migrate(conn); err != nil {
		t.Fatal(err)
	}
	if err = db.Migrate(conn); err != nil {
		t.Fatal(err)
	}
	var h hotel.Hotel
	if err = conn.First(&h, "slug = ?", "legacy").Error; err != nil {
		t.Fatal(err)
	}
	if h.Name != "Legacy hotel" || h.Amenities == nil {
		t.Fatalf("legacy data lost: %+v", h)
	}
	var count int64
	conn.Table("hotel_members").Count(&count)
	if count != 0 {
		t.Fatal("legacy hotel was claimed without authorization")
	}
}
