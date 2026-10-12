package hotel

import (
	"context"
	"errors"
	"fmt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrHotelNotFound = errors.New("hotel not found")
	ErrSlugExists    = errors.New("hotel slug already exists")
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }
func (r *Repository) List(ctx context.Context, page, limit int) ([]Hotel, error) {
	items := make([]Hotel, 0)
	if err := r.db.WithContext(ctx).Order("created_at DESC, id ASC").Offset((page - 1) * limit).Limit(limit).Find(&items).Error; err != nil {
		return nil, fmt.Errorf("failed to list hotels: %w", err)
	}
	return items, nil
}
func (r *Repository) Create(ctx context.Context, hotel *Hotel) (*Hotel, error) {
	err := r.db.WithContext(ctx).Create(hotel).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return nil, ErrSlugExists
	}
	if err != nil {
		return nil, fmt.Errorf("failed to create hotel: %w", err)
	}
	return hotel, nil
}
func (r *Repository) Update(ctx context.Context, id string, hotel *Hotel) (*Hotel, error) {
	var updated Hotel
	result := r.db.WithContext(ctx).Model(&updated).Clauses(clause.Returning{}).Where("id = ?", id).Updates(map[string]any{
		"name": hotel.Name, "slug": hotel.Slug, "address": hotel.Address,
		"city": hotel.City, "country": hotel.Country, "rank": hotel.Rank,
	})
	if errors.Is(result.Error, gorm.ErrDuplicatedKey) {
		return nil, ErrSlugExists
	}
	if result.Error != nil {
		return nil, fmt.Errorf("failed to update hotel: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, ErrHotelNotFound
	}
	return &updated, nil
}
func (r *Repository) Delete(ctx context.Context, hotel *Hotel) error {
	result := r.db.WithContext(ctx).Where("id = ?", hotel.ID).Delete(&Hotel{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete hotel: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrHotelNotFound
	}
	return nil
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
