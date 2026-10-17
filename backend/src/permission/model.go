package permission

import (
	"context"
	"errors"
	"gorm.io/gorm"
)

var ErrForbidden = errors.New("forbidden")

type HotelMember struct {
	HotelID string `json:"hotel_id" gorm:"type:uuid;primaryKey"`
	UserID  string `json:"user_id" gorm:"type:uuid;primaryKey"`
	Role    string `json:"role" gorm:"type:varchar(20);not null"`
}
type Service struct{ DB *gorm.DB }

func New(db *gorm.DB) *Service { return &Service{DB: db} }
func (s *Service) IsAdmin(ctx context.Context, userID string) (bool, error) {
	var count int64
	err := s.DB.WithContext(ctx).Table("user_roles ur").Joins("JOIN roles r ON r.id = ur.role_id").Where("ur.user_id = ? AND r.name = ?", userID, "admin").Count(&count).Error
	return count > 0, err
}
func (s *Service) Require(ctx context.Context, userID, hotelID, action string) error {
	admin, err := s.IsAdmin(ctx, userID)
	if err != nil {
		return err
	}
	if admin {
		return nil
	}
	var member HotelMember
	err = s.DB.WithContext(ctx).Where("user_id = ? AND hotel_id = ?", userID, hotelID).First(&member).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrForbidden
	}
	if err != nil {
		return err
	}
	if member.Role == "owner" || (member.Role == "manager" && action != "members" && action != "delete") || (member.Role == "staff" && action == "bookings") {
		return nil
	}
	return ErrForbidden
}
