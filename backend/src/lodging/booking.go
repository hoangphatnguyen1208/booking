package lodging

import (
	"booking/src/hotel"
	"booking/src/permission"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"strings"
	"time"
)

type BookingInput struct {
	RoomTypeID    string `json:"room_type_id" binding:"required,uuid"`
	CheckIn       string `json:"check_in" binding:"required"`
	CheckOut      string `json:"check_out" binding:"required"`
	Rooms         int    `json:"rooms" binding:"required,min=1,max=100"`
	Guests        int    `json:"guests" binding:"required,min=1,max=2000"`
	GuestName     string `json:"guest_name" binding:"required,max=100"`
	Phone         string `json:"phone" binding:"required,max=30"`
	ExpectedTotal int64  `json:"expected_total" binding:"min=0"`
}

func (s *Service) Book(ctx context.Context, actor, key string, in BookingInput) (*Booking, error) {
	days, err := dates(in.CheckIn, in.CheckOut, 90)
	if err != nil {
		return nil, err
	}
	location, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	today := time.Now().In(location).Format("2006-01-02")
	if in.CheckIn < today || in.Rooms < 1 || in.Rooms > 100 || in.Guests < 1 || in.Guests > 2000 || strings.TrimSpace(in.GuestName) == "" || strings.TrimSpace(in.Phone) == "" || len(key) < 8 || len(key) > 100 {
		return nil, fail(400, "Invalid booking or idempotency key")
	}
	data, _ := json.Marshal(in)
	sum := sha256.Sum256(data)
	hash := hex.EncodeToString(sum[:])
	var result Booking
	err = s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", actor+":"+key).Error; err != nil {
			return err
		}
		err := tx.Preload("Nights").Where("user_id = ? AND idempotency_key = ?", actor, key).First(&result).Error
		if err == nil {
			if result.RequestHash != hash {
				return fail(409, "Idempotency key was used for another request")
			}
			return nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		var room RoomType
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&room, "id = ?", in.RoomTypeID).Error; err != nil {
			return dbError(err)
		}
		if !room.Active || room.Capacity*in.Rooms < in.Guests {
			return fail(409, "Room is unavailable or guest capacity exceeded")
		}
		var h hotel.Hotel
		if err := tx.First(&h, "id = ?", room.HotelID).Error; err != nil {
			return fail(404, "Hotel is unavailable")
		}
		rows := []Inventory{}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("room_type_id = ? AND date >= ? AND date < ?", room.ID, in.CheckIn, in.CheckOut).Order("date").Find(&rows).Error; err != nil {
			return err
		}
		if len(rows) != len(days) {
			return fail(409, "Room is not available for all nights")
		}
		var total int64
		nights := []BookingNight{}
		for _, row := range rows {
			if row.Capacity-row.Reserved < in.Rooms {
				return fail(409, "Not enough rooms available")
			}
			total += row.Price * int64(in.Rooms)
			nights = append(nights, BookingNight{Date: row.Date, Price: row.Price, Rooms: in.Rooms})
		}
		if total != in.ExpectedTotal {
			return fail(409, "Price changed; check availability again")
		}
		cancelBefore, err := time.ParseInLocation("2006-01-02", in.CheckIn, location)
		if err != nil {
			return err
		}
		result = Booking{UserID: actor, HotelID: h.ID, RoomTypeID: room.ID, IdempotencyKey: key, RequestHash: hash, HotelName: h.Name, RoomName: room.Name, CheckIn: in.CheckIn, CheckOut: in.CheckOut, Rooms: in.Rooms, Guests: in.Guests, GuestName: strings.TrimSpace(in.GuestName), Phone: strings.TrimSpace(in.Phone), Status: "confirmed", PaymentStatus: "unpaid", Currency: "VND", Total: total, CancelBefore: cancelBefore, Nights: nights}
		if err := tx.Create(&result).Error; err != nil {
			return err
		}
		update := tx.Model(&Inventory{}).Where("room_type_id = ? AND date >= ? AND date < ? AND capacity - reserved >= ?", room.ID, in.CheckIn, in.CheckOut, in.Rooms).Update("reserved", gorm.Expr("reserved + ?", in.Rooms))
		if update.Error != nil {
			return update.Error
		}
		if update.RowsAffected != int64(len(days)) {
			return fail(409, "Inventory changed")
		}
		return nil
	})
	return &result, err
}
func (s *Service) MyBookings(ctx context.Context, actor string, page int) ([]Booking, error) {
	rows := []Booking{}
	err := s.DB.WithContext(ctx).Where("user_id = ?", actor).Order("created_at DESC,id").Offset((page - 1) * 20).Limit(20).Find(&rows).Error
	return rows, err
}
func (s *Service) Booking(ctx context.Context, actor, id string) (*Booking, error) {
	var row Booking
	if err := s.DB.WithContext(ctx).Preload("Nights").First(&row, "id = ?", id).Error; err != nil {
		return nil, dbError(err)
	}
	if row.UserID != actor {
		if err := permission.New(s.DB).Require(ctx, actor, row.HotelID, "bookings"); err != nil {
			return nil, err
		}
	}
	return &row, nil
}
func (s *Service) Cancel(ctx context.Context, actor, id string) (*Booking, error) {
	original, err := s.Booking(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	// Owners can inspect hotel bookings, but only the guest or owner/manager can cancel.
	if original.UserID != actor {
		if err := permission.New(s.DB).Require(ctx, actor, original.HotelID, "edit"); err != nil {
			return nil, err
		}
	}
	var result Booking
	err = s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var room RoomType
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&room, "id = ?", original.RoomTypeID).Error; err != nil {
			return dbError(err)
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Nights").First(&result, "id = ?", id).Error; err != nil {
			return dbError(err)
		}
		if result.Status == "cancelled" {
			return nil
		}
		if result.Status != "confirmed" || !time.Now().Before(result.CancelBefore) {
			return fail(409, "Cancellation deadline has passed")
		}
		days, err := dates(result.CheckIn[:10], result.CheckOut[:10], 90)
		if err != nil {
			return err
		}
		update := tx.Model(&Inventory{}).Where("room_type_id = ? AND date >= ? AND date < ? AND reserved >= ?", result.RoomTypeID, result.CheckIn, result.CheckOut, result.Rooms).Update("reserved", gorm.Expr("reserved - ?", result.Rooms))
		if update.Error != nil {
			return update.Error
		}
		if update.RowsAffected != int64(len(days)) {
			return fail(409, "Inventory is inconsistent; contact support")
		}
		if err := tx.Model(&result).Update("status", "cancelled").Error; err != nil {
			return err
		}
		return nil
	})
	return &result, err
}
