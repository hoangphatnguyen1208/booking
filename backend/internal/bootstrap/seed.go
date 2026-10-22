package bootstrap

import (
	"booking/src/hotel"
	"booking/src/identity"
	"booking/src/lodging"
	"context"
	"errors"
	"fmt"
	"gorm.io/gorm"
	"strings"
	"time"
)

type Options struct {
	OwnerEmail   string
	Hotels, Days int
	From         string
	Progress     func(string)
}

func progress(in Options, message string) {
	if in.Progress != nil {
		in.Progress(message)
	}
}

type Result struct{ Hotels, Rooms, Nights, Skipped int }

func Validate(in Options) (time.Time, error) {
	if strings.TrimSpace(in.OwnerEmail) == "" || in.Hotels < 1 || in.Hotels > 100 || in.Days < 1 || in.Days > 366 {
		return time.Time{}, errors.New("owner-email is required; hotels must be 1-100 and days 1-366")
	}
	return time.Parse("2006-01-02", in.From)
}

func Seed(ctx context.Context, conn *gorm.DB, in Options) (Result, error) {
	var out Result
	start, err := Validate(in)
	if err != nil {
		return out, err
	}
	err = conn.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Serialize repeated seed commands; reruns never update existing inventory.
		progress(in, "Waiting for sample-data import lock...")
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtext('booking-demo-seed-v1'))").Error; err != nil {
			return err
		}
		progress(in, "Import lock acquired; preparing hotels and room inventory...")
		var owner identity.User
		if err := tx.Where("email = ?", strings.TrimSpace(in.OwnerEmail)).First(&owner).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("owner account not found; register that email before seeding")
			}
			return err
		}
		hotels := hotel.NewService(hotel.NewRepository(tx))
		rooms := lodging.New(tx)
		for i := 0; i < in.Hotels; i++ {
			slug := fmt.Sprintf("booking-demo-%03d", i+1)
			var count int64
			if err := tx.Unscoped().Model(&hotel.Hotel{}).Where("slug = ?", slug).Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				out.Skipped++
				progress(in, fmt.Sprintf("[%d/%d] Skipped existing %s", i+1, in.Hotels, slug))
				continue
			}
			place := destinations[i%len(destinations)]
			h, err := hotels.CreateForActor(ctx, owner.ID, &hotel.CreateRequest{
				Name: fmt.Sprintf("%s %s %02d (Mẫu)", hotelNames[i%len(hotelNames)], place.City, i+1),
				Slug: slug, Address: fmt.Sprintf("Khu lưu trú mẫu %02d, %s", i+1, place.City),
				City: place.City, Country: "VN", Rank: uint(3 + i%3),
				ImageURL:  sampleHotelImages[i%len(sampleHotelImages)],
				Amenities: []string{"Wi-Fi miễn phí", "Điều hòa", "Lễ tân 24 giờ", "Bãi đỗ xe"},
			})
			if err != nil {
				return fmt.Errorf("hotel %s: %w", slug, err)
			}
			for n, kind := range roomKinds {
				room, err := rooms.SaveRoom(ctx, owner.ID, h.ID, "", lodging.RoomInput{
					ImageURL: sampleRoomImages[n%len(sampleRoomImages)], Name: kind.Name, Capacity: kind.Capacity, TotalRooms: kind.Total, Active: true,
				})
				if err != nil {
					return fmt.Errorf("create room %q for hotel %s (%s): %w", kind.Name, slug, h.ID, err)
				}
				if err := rooms.PutInventory(ctx, owner.ID, room.ID, lodging.InventoryInput{
					From: start.Format("2006-01-02"), To: start.AddDate(0, 0, in.Days).Format("2006-01-02"),
					Capacity: kind.Total, Price: 450000 + int64(i%10)*50000 + int64(n)*350000,
				}); err != nil {
					return fmt.Errorf("inventory for room %q (%s), hotel %s (%s): %w", kind.Name, room.ID, slug, h.ID, err)
				}
				out.Rooms++
				out.Nights += in.Days
			}
			out.Hotels++
			progress(in, fmt.Sprintf("[%d/%d] Prepared %s and 3 room types (pending commit)", i+1, in.Hotels, slug))
		}
		return nil
	})
	if err != nil {
		return Result{}, err
	}
	return out, nil
}

var destinations = []struct{ City string }{
	{"Đà Lạt"}, {"Đà Nẵng"}, {"Hội An"}, {"Nha Trang"}, {"Phú Quốc"},
	{"Hà Nội"}, {"TP. Hồ Chí Minh"}, {"Huế"}, {"Sa Pa"}, {"Vũng Tàu"},
}
var hotelNames = []string{"An Nhiên Retreat", "Mây Boutique", "Bình Minh Hotel", "Lá Xanh Stay", "Ánh Dương Resort"}
var roomKinds = []struct {
	Name            string
	Capacity, Total int
}{
	{"Standard giường đôi", 2, 10},
	{"Deluxe ban công", 3, 6},
	{"Family Suite", 4, 4},
}

// Keep these demo photo URLs aligned with migration 008_demo_photos.sql.
var sampleHotelImages = []string{
	"https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=960&q=80",
	"https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=960&q=80",
	"https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=960&q=80",
	"https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=960&q=80",
}
var sampleRoomImages = []string{
	"https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=960&q=80",
	"https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=960&q=80",
	"https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=960&q=80",
}
