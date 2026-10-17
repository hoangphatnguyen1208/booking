package lodging_test

import (
	"booking/src/lodging"
	"booking/src/permission"
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
)

func TestConcurrentBookingIdempotencyCancellation(t *testing.T) {
	conn, s, owner, guest, h := fixture(t)
	ctx := context.Background()
	room, err := s.SaveRoom(ctx, owner.ID, h.ID, "", lodging.RoomInput{Name: "Last room", Capacity: 2, TotalRooms: 1, Active: true})
	if err != nil {
		t.Fatal(err)
	}
	if err = s.PutInventory(ctx, owner.ID, room.ID, lodging.InventoryInput{From: "2030-01-01", To: "2030-01-03", Capacity: 1, Price: 500000}); err != nil {
		t.Fatal(err)
	}
	input := lodging.BookingInput{RoomTypeID: room.ID, CheckIn: "2030-01-01", CheckOut: "2030-01-03", Rooms: 1, Guests: 2, GuestName: "Guest", Phone: "0900000000", ExpectedTotal: 1000000}
	wrong := input
	wrong.ExpectedTotal = 1
	if _, err = s.Book(ctx, guest.ID, "wrong-price", wrong); err == nil {
		t.Fatal("accepted stale price")
	}
	var successes atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, err := s.Book(ctx, guest.ID, "concurrent-key-"+string(rune('a'+i)), input)
			if err == nil {
				successes.Add(1)
			} else {
				var f *lodging.Failure
				if !errors.As(err, &f) || f.Status != 409 {
					t.Errorf("unexpected concurrent error: %v", err)
				}
			}
		}(i)
	}
	wg.Wait()
	if successes.Load() != 1 {
		t.Fatalf("oversold or no booking: %d", successes.Load())
	}
	var booking lodging.Booking
	if err = conn.First(&booking).Error; err != nil {
		t.Fatal(err)
	}
	replay, err := s.Book(ctx, guest.ID, booking.IdempotencyKey, input)
	if err != nil || replay.ID != booking.ID {
		t.Fatalf("idempotent replay: %v", err)
	}
	changed := input
	changed.GuestName = "Changed"
	if _, err = s.Book(ctx, guest.ID, booking.IdempotencyKey, changed); err == nil {
		t.Fatal("accepted different payload for same key")
	}
	stranger := owner
	stranger.ID = "99999999-9999-9999-9999-999999999999"
	if _, err = s.Booking(ctx, stranger.ID, booking.ID); !errors.Is(err, permission.ErrForbidden) {
		t.Fatalf("foreign booking visible: %v", err)
	}
	if _, err = s.Cancel(ctx, guest.ID, booking.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = s.Cancel(ctx, guest.ID, booking.ID); err != nil {
		t.Fatal(err)
	}
	var rows []lodging.Inventory
	conn.Find(&rows)
	for _, row := range rows {
		if row.Reserved != 0 {
			t.Fatalf("cancellation released inventory incorrectly: %+v", row)
		}
	}
	available, err := s.Availability(ctx, h.ID, input.CheckIn, input.CheckOut, 1, 2)
	if err != nil || len(available) != 1 {
		t.Fatalf("inventory not restored: %v", err)
	}
}
