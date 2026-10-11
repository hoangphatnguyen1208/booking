package hotel

import (
	"context"
	"errors"
	"fmt"
	"gorm.io/gorm"
)

var (
	ErrHotelNotFound = errors.New("hotel not found")
	ErrSlugExists    = errors.New("hotel slug already exists")
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }
func (r *Repository) Create(ctx context.Context, hotel *Hotel) (*Hotel, error) {
	err := r.db.Create(hotel).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return nil, ErrSlugExists
	}
	if err != nil {
		return nil, fmt.Errorf("failed to create hotel: %w", err)
	}
	return hotel, nil
}
func (r *Repository) Update(ctx context.Context, id string, hotel *Hotel) (*Hotel, error) {
	err := r.db.WithContext(ctx).Where("id = ?", id).Updates(hotel).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrHotelNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update hotel: %w", err)
	}
	return hotel, nil
}
func (r *Repository) Delete(ctx context.Context, hotel *Hotel) error {
	return r.db.Where("id = ?", hotel.ID).Delete(hotel).Error
}
func (r *Repository) FindByID(ctx context.Context, id string) (*Hotel, error) {
	var hotel Hotel
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&hotel).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrHotelNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find hotel by ID: %w", err)
	}
	return &hotel, nil
}
func (r *Repository) FindBySlug(ctx context.Context, slug string) (*Hotel, error) {
	var hotel Hotel
	err := r.db.WithContext(ctx).Where("slug = ?", slug).First(&hotel).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrHotelNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find hotel by slug: %w", err)
	}
	return &hotel, nil
}
