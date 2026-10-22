package lodging_test

import (
	"booking/src/lodging"
	"context"
	"testing"
	"time"
)

func TestBookingPhotoRemainsAvailableForInactiveRoomsAndCancelledBookings(t *testing.T) {
	_, service, owner, guest, h := fixture(t)
	ctx := context.Background()
	photo := "https://example.com/booked-room.jpg"
	input := lodging.RoomInput{Name: "Booked double", ImageURL: photo, Capacity: 2, TotalRooms: 5, Active: true}
	room, err := service.SaveRoom(ctx, owner.ID, h.ID, "", input)
	if err != nil {
		t.Fatal(err)
	}
	start := time.Now().UTC().AddDate(0, 0, 3)
	from, to := start.Format("2006-01-02"), start.AddDate(0, 0, 2).Format("2006-01-02")
	if err = service.PutInventory(ctx, owner.ID, room.ID, lodging.InventoryInput{From: from, To: to, Capacity: 5, Price: 500000}); err != nil {
		t.Fatal(err)
	}
	booked, err := service.Book(ctx, guest.ID, "room-photo-booking", lodging.BookingInput{RoomTypeID: room.ID, CheckIn: from, CheckOut: to, Rooms: 1, Guests: 2, GuestName: "Photo guest", Phone: "0901234567", ExpectedTotal: 1000000})
	if err != nil {
		t.Fatal(err)
	}
	input.Active = false
	if _, err = service.SaveRoom(ctx, owner.ID, h.ID, room.ID, input); err != nil {
		t.Fatal(err)
	}
	detail, err := service.Booking(ctx, guest.ID, booked.ID)
	if err != nil || detail.RoomImageURL != photo {
		t.Fatalf("inactive room photo missing: %+v %v", detail, err)
	}
	cancelled, err := service.Cancel(ctx, guest.ID, booked.ID)
	if err != nil || cancelled.RoomImageURL != photo || cancelled.Status != "cancelled" {
		t.Fatalf("cancel response lost image: %+v %v", cancelled, err)
	}
}
