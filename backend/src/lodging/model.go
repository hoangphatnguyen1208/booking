package lodging

import (
	"gorm.io/gorm"
	"time"
)

type RoomType struct {
	ID         string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	HotelID    string    `json:"hotel_id" gorm:"type:uuid;not null;index"`
	Name       string    `json:"name" gorm:"type:varchar(100);not null"`
	Capacity   int       `json:"capacity" gorm:"not null;check:capacity > 0 AND capacity <= 20"`
	TotalRooms int       `json:"total_rooms" gorm:"not null;check:total_rooms > 0 AND total_rooms <= 10000"`
	Active     bool      `json:"active" gorm:"not null"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
type Inventory struct {
	RoomTypeID string    `json:"room_type_id" gorm:"type:uuid;primaryKey"`
	Date       time.Time `json:"date" gorm:"type:date;primaryKey"`
	Capacity   int       `json:"capacity" gorm:"not null;check:capacity >= 0 AND reserved >= 0 AND reserved <= capacity"`
	Reserved   int       `json:"reserved" gorm:"not null;default:0"`
	Price      int64     `json:"price" gorm:"not null;check:price >= 0 AND price <= 1000000000000"`
}
type Booking struct {
	ID             string         `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID         string         `json:"user_id" gorm:"type:uuid;not null;uniqueIndex:booking_request"`
	HotelID        string         `json:"hotel_id" gorm:"type:uuid;not null;index"`
	RoomTypeID     string         `json:"room_type_id" gorm:"type:uuid;not null;index"`
	IdempotencyKey string         `json:"-" gorm:"size:100;not null;uniqueIndex:booking_request"`
	RequestHash    string         `json:"-" gorm:"size:64;not null"`
	HotelName      string         `json:"hotel_name"`
	RoomName       string         `json:"room_name"`
	CheckIn        string         `json:"check_in" gorm:"type:date;not null"`
	CheckOut       string         `json:"check_out" gorm:"type:date;not null"`
	Rooms          int            `json:"rooms" gorm:"not null;check:rooms > 0"`
	Guests         int            `json:"guests" gorm:"not null;check:guests > 0"`
	GuestName      string         `json:"guest_name" gorm:"size:100;not null"`
	Phone          string         `json:"phone" gorm:"size:30;not null"`
	Status         string         `json:"status" gorm:"size:20;not null;index"`
	PaymentStatus  string         `json:"payment_status" gorm:"size:20;not null"`
	Currency       string         `json:"currency" gorm:"size:3;not null"`
	Total          int64          `json:"total" gorm:"not null"`
	CancelBefore   time.Time      `json:"cancel_before" gorm:"not null"`
	Nights         []BookingNight `json:"nights" gorm:"foreignKey:BookingID"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}
type BookingNight struct {
	BookingID string    `json:"-" gorm:"type:uuid;primaryKey"`
	Date      time.Time `json:"date" gorm:"type:date;primaryKey"`
	Price     int64     `json:"price"`
	Rooms     int       `json:"rooms"`
}

func (b *Booking) AfterFind(tx *gorm.DB) error {
	if len(b.CheckIn) > 10 {
		b.CheckIn = b.CheckIn[:10]
	}
	if len(b.CheckOut) > 10 {
		b.CheckOut = b.CheckOut[:10]
	}
	return nil
}

type Service struct{ DB *gorm.DB }
type MemberInput struct {
	Email string `json:"email" binding:"required,email"`
	Role  string `json:"role" binding:"required,oneof=owner manager staff remove"`
}
type MemberRow struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
}
type AdminInput struct {
	Enabled *bool `json:"enabled" binding:"required"`
}

func New(db *gorm.DB) *Service { return &Service{DB: db} }
