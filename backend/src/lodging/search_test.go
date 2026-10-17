package lodging_test

import (
	"booking/src/hotel"
	"booking/src/lodging"
	"context"
	"testing"
)

func TestHotelContentAndAvailabilitySearch(t *testing.T) {
	conn, s, owner, _, h := fixture(t)
	ctx := context.Background()
	hotels := hotel.NewService(hotel.NewRepository(conn))
	updated, err := hotels.UpdateForActor(ctx, owner.ID, h.ID, &hotel.UpdateRequest{Name: "Content Hotel", Slug: "content-hotel", City: "Hue", Country: "VN", Rank: 4, ImageURL: "https://example.com/hotel.jpg", Amenities: []string{"Wi-Fi", "Parking"}})
	if err != nil || len(updated.Amenities) != 2 || updated.ImageURL == "" {
		t.Fatalf("hotel content roundtrip: %+v %v", updated, err)
	}
	found, err := hotels.Search(ctx, 1, 20, "Hue", 4, "", "", "", 1, 2)
	if err != nil || len(found) != 1 {
		t.Fatalf("destination/rank search: %v", err)
	}
	found, err = hotels.Search(ctx, 1, 20, "Hue", 4, "", "2030-01-01", "2030-01-03", 1, 2)
	if err != nil || len(found) != 0 {
		t.Fatalf("missing inventory was advertised: %v", err)
	}
	room, err := s.SaveRoom(ctx, owner.ID, h.ID, "", lodging.RoomInput{Name: "Double", Capacity: 2, TotalRooms: 1, Active: true})
	if err != nil {
		t.Fatal(err)
	}
	if err = s.PutInventory(ctx, owner.ID, room.ID, lodging.InventoryInput{From: "2030-01-01", To: "2030-01-03", Capacity: 1, Price: 500000}); err != nil {
		t.Fatal(err)
	}
	found, err = hotels.Search(ctx, 1, 20, "Hue", 4, "", "2030-01-01", "2030-01-03", 1, 2)
	if err != nil || len(found) != 1 {
		t.Fatalf("availability search: %+v %v", found, err)
	}
	if err = hotels.DeleteForActor(ctx, owner.ID, h.ID); err != nil {
		t.Fatal(err)
	}
	found, err = hotels.Search(ctx, 1, 20, "Hue", 4, "", "", "", 1, 2)
	if err != nil || len(found) != 0 {
		t.Fatal("archived hotel visible")
	}
}
