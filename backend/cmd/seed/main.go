package main

import (
	"booking/src/config"
	"booking/src/db"
	"booking/src/hotel"
	"booking/src/identity"
	"booking/src/lodging"
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"strings"
	"time"
	_ "time/tzdata"

	"gorm.io/gorm"
)

type options struct {
	OwnerEmail   string
	Hotels, Days int
	From         string
}

type result struct{ Hotels, Rooms, Nights, Skipped int }

func main() {
	loc, err := time.LoadLocation("Asia/Ho_Chi_Minh")
	if err != nil {
		log.Fatal(err)
	}
	var in options
	flag.StringVar(&in.OwnerEmail, "owner-email", "", "Existing registered owner email (required)")
	flag.IntVar(&in.Hotels, "hotels", 20, "Number of sample hotels, 1-100")
	flag.IntVar(&in.Days, "days", 90, "Days of daily inventory, 1-366")
	flag.StringVar(&in.From, "from", time.Now().In(loc).Format("2006-01-02"), "First inventory date in Vietnam, YYYY-MM-DD")
	flag.Parse()
	if _, err := validate(in); err != nil {
		log.Fatal(err)
	}
	conn := db.Connect(config.NewEnv())
	if err := db.Migrate(conn); err != nil {
		log.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	out, err := seed(ctx, conn, in)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("Created %d sample hotels, %d room types, %d room-night inventory rows; skipped %d existing hotels", out.Hotels, out.Rooms, out.Nights, out.Skipped)
}

func validate(in options) (time.Time, error) {
	if strings.TrimSpace(in.OwnerEmail) == "" || in.Hotels < 1 || in.Hotels > 100 || in.Days < 1 || in.Days > 366 {
		return time.Time{}, errors.New("owner-email is required; hotels must be 1-100 and days 1-366")
	}
	return time.Parse("2006-01-02", in.From)
}

func seed(ctx context.Context, conn *gorm.DB, in options) (result, error) {
	var out result
	start, err := validate(in)
	if err != nil {
		return out, err
	}
	err = conn.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Serialize repeated seed commands; reruns never update existing inventory.
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtext('booking-demo-seed-v1'))").Error; err != nil {
			return err
		}
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
				continue
			}
			place := destinations[i%len(destinations)]
			h, err := hotels.CreateForActor(ctx, owner.ID, &hotel.CreateRequest{
				Name: fmt.Sprintf("%s %s %02d (Mẫu)", hotelNames[i%len(hotelNames)], place.City, i+1),
				Slug: slug, Address: fmt.Sprintf("Khu lưu trú mẫu %02d, %s", i+1, place.City),
				City: place.City, Country: "VN", Rank: uint(3 + i%3),
				Amenities: []string{"Wi-Fi miễn phí", "Điều hòa", "Lễ tân 24 giờ", "Bãi đỗ xe"},
			})
			if err != nil {
				return fmt.Errorf("hotel %s: %w", slug, err)
			}
			for n, kind := range roomKinds {
				room, err := rooms.SaveRoom(ctx, owner.ID, h.ID, "", lodging.RoomInput{
					Name: kind.Name, Capacity: kind.Capacity, TotalRooms: kind.Total, Active: true,
				})
				if err != nil {
					return err
				}
				if err := rooms.PutInventory(ctx, owner.ID, room.ID, lodging.InventoryInput{
					From: start.Format("2006-01-02"), To: start.AddDate(0, 0, in.Days).Format("2006-01-02"),
					Capacity: kind.Total, Price: 450000 + int64(i%10)*50000 + int64(n)*350000,
				}); err != nil {
					return err
				}
				out.Rooms++
				out.Nights += in.Days
			}
			out.Hotels++
		}
		return nil
	})
	if err != nil {
		return result{}, err
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
