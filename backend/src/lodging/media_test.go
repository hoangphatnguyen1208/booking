package lodging_test

import (
	"booking/src/hotel"
	"booking/src/lodging"
	"context"
	"os"
	"strings"
	"testing"
)

func TestRoomImagePersistenceAndValidation(t *testing.T) {
	_, service, owner, other, h := fixture(t)
	ctx := context.Background()
	input := lodging.RoomInput{Name: "Double", Capacity: 2, TotalRooms: 5, Active: true, ImageURL: "https://example.com/room.jpg"}
	room, err := service.SaveRoom(ctx, owner.ID, h.ID, "", input)
	if err != nil {
		t.Fatal(err)
	}
	loaded, err := service.Room(ctx, room.ID)
	if err != nil || loaded.ImageURL != input.ImageURL {
		t.Fatalf("image not persisted: %+v %v", loaded, err)
	}
	input.ImageURL = "https://example.com/changed.jpg"
	if _, err = service.SaveRoom(ctx, other.ID, h.ID, room.ID, input); err == nil {
		t.Fatal("non-owner changed image")
	}
	input.ImageURL = "http://example.com/room.jpg"
	if _, err = service.SaveRoom(ctx, owner.ID, h.ID, room.ID, input); err == nil {
		t.Fatal("accepted insecure image")
	}
	input.ImageURL = ""
	if _, err = service.SaveRoom(ctx, owner.ID, h.ID, room.ID, input); err != nil {
		t.Fatal(err)
	}
	loaded, err = service.Room(ctx, room.ID)
	if err != nil || loaded.ImageURL != "" {
		t.Fatalf("could not clear image: %+v %v", loaded, err)
	}
}

func TestDemoPhotoBackfillPreservesCustomImages(t *testing.T) {
	conn, service, owner, _, h := fixture(t)
	ctx := context.Background()
	room, err := service.SaveRoom(ctx, owner.ID, h.ID, "", lodging.RoomInput{Name: "Standard giường đôi", Capacity: 2, TotalRooms: 5, Active: true})
	if err != nil {
		t.Fatal(err)
	}
	sql, err := os.ReadFile("../db/migrations/008_demo_photos.sql")
	if err != nil {
		t.Fatal(err)
	}
	// Non-demo hotels must not receive unrelated photos.
	if err = conn.Exec(string(sql)).Error; err != nil {
		t.Fatal(err)
	}
	loaded, err := service.Room(ctx, room.ID)
	if err != nil || loaded.ImageURL != "" {
		t.Fatal("backfill changed a real hotel")
	}
	if err = conn.Model(&hotel.Hotel{}).Where("id = ?", h.ID).Update("slug", "booking-demo-001").Error; err != nil {
		t.Fatal(err)
	}
	if err = conn.Exec(string(sql)).Error; err != nil {
		t.Fatal(err)
	}
	loaded, err = service.Room(ctx, room.ID)
	if err != nil || !strings.HasPrefix(loaded.ImageURL, "https://images.unsplash.com/") {
		t.Fatalf("missing demo room photo: %+v %v", loaded, err)
	}
	if err = conn.First(&h, "id = ?", h.ID).Error; err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(h.ImageURL, "https://images.unsplash.com/") {
		t.Fatal("missing demo hotel photo")
	}
	custom := "https://example.com/custom.jpg"
	if err = conn.Model(&hotel.Hotel{}).Where("id = ?", h.ID).Update("image_url", custom).Error; err != nil {
		t.Fatal(err)
	}
	if err = conn.Model(&lodging.RoomType{}).Where("id = ?", room.ID).Update("image_url", custom).Error; err != nil {
		t.Fatal(err)
	}
	if err = conn.Exec(string(sql)).Error; err != nil {
		t.Fatal(err)
	}
	loaded, err = service.Room(ctx, room.ID)
	if err != nil || loaded.ImageURL != custom {
		t.Fatal("backfill replaced owner room image")
	}
	if err = conn.First(&h, "id = ?", h.ID).Error; err != nil || h.ImageURL != custom {
		t.Fatal("backfill replaced owner hotel image")
	}
}
