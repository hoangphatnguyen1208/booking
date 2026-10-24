package lodging_test

import (
	"booking/src/db"
	"booking/src/hotel"
	"booking/src/identity"
	"booking/src/lodging"
	"booking/src/permission"
	"context"
	"crypto/rand"
	"encoding/hex"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"os"
	"testing"
)

func fixture(t *testing.T) (*gorm.DB, *lodging.Service, identity.User, identity.User, hotel.Hotel) {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL is required for PostgreSQL integration tests")
	}
	root, err := gorm.Open(postgres.Open(dsn), &gorm.Config{TranslateError: true})
	if err != nil {
		t.Fatal(err)
	}
	key := make([]byte, 8)
	if _, err = rand.Read(key); err != nil {
		t.Fatal(err)
	}
	schema := "test_" + hex.EncodeToString(key)
	if err = root.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatal(err)
	}
	conn, err := gorm.Open(postgres.Open(dsn+" search_path="+schema), &gorm.Config{TranslateError: true})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		pool, _ := conn.DB()
		pool.Close()
		root.Exec("DROP SCHEMA " + schema + " CASCADE")
		p, _ := root.DB()
		p.Close()
	})
	if err = db.Migrate(conn); err != nil {
		t.Fatal(err)
	}
	owner := identity.User{Email: "owner@example.test", HashedPassword: "test"}
	other := identity.User{Email: "other@example.test", HashedPassword: "test"}
	if err = conn.Create(&owner).Error; err != nil {
		t.Fatal(err)
	}
	if err = conn.Create(&other).Error; err != nil {
		t.Fatal(err)
	}
	h, err := hotel.NewService(hotel.NewRepository(conn)).Create(context.Background(), &hotel.CreateRequest{Name: "Hotel", Slug: "hotel", City: "Hue", Country: "VN"})
	if err != nil {
		t.Fatal(err)
	}
	if err = conn.Create(&permission.HotelMember{HotelID: h.ID, UserID: owner.ID, Role: "owner"}).Error; err != nil {
		t.Fatal(err)
	}
	return conn, lodging.New(conn), owner, other, *h
}
func TestOwnershipAndInventory(t *testing.T) {
	conn, s, owner, other, h := fixture(t)
	ctx := context.Background()
	if err := permission.New(conn).Require(ctx, other.ID, h.ID, "edit"); err != permission.ErrForbidden {
		t.Fatalf("unauthorized actor: %v", err)
	}
	room, err := s.SaveRoom(ctx, owner.ID, h.ID, "", lodging.RoomInput{Name: "Double", Capacity: 2, TotalRooms: 1, Active: true})
	if err != nil {
		t.Fatal(err)
	}
	input := lodging.InventoryInput{From: "2030-01-01", To: "2030-01-03", Capacity: 1, Price: 500000}
	if err = s.PutInventory(ctx, other.ID, room.ID, input); err != permission.ErrForbidden {
		t.Fatalf("foreign inventory edit: %v", err)
	}
	if err = s.PutInventory(ctx, owner.ID, room.ID, input); err != nil {
		t.Fatal(err)
	}
	available, err := s.Availability(ctx, h.ID, input.From, input.To, 1, 2)
	if err != nil || len(available) != 1 || available[0].Total != 1000000 {
		t.Fatalf("availability: %+v %v", available, err)
	}
	if err = conn.Model(&lodging.Inventory{}).Where("room_type_id = ?", room.ID).Update("reserved", 1).Error; err != nil {
		t.Fatal(err)
	}
	input.Price = 600000
	if err = s.PutInventory(ctx, owner.ID, room.ID, input); err != nil {
		t.Fatal(err)
	}
	rows, err := s.Inventory(ctx, owner.ID, room.ID, input.From, input.To)
	if err != nil || len(rows) != 2 {
		t.Fatalf("batch update: %+v %v", rows, err)
	}
	for _, row := range rows {
		if row.Reserved != 1 || row.Price != 600000 || row.Capacity != 1 {
			t.Fatalf("batch upsert changed reservations: %+v", row)
		}
	}
	input.Capacity = 0
	if err = s.PutInventory(ctx, owner.ID, room.ID, input); err == nil {
		t.Fatal("reduced inventory below reservations")
	}
	available, err = s.Availability(ctx, h.ID, input.From, input.To, 1, 2)
	if err != nil || len(available) != 0 {
		t.Fatalf("sold out: %+v %v", available, err)
	}
}
