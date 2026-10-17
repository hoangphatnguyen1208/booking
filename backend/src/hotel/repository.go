package hotel

import (
	"context"
	"errors"
	"fmt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"time"
)

var (
	ErrHotelNotFound = errors.New("hotel not found")
	ErrSlugExists    = errors.New("hotel slug already exists")
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }
func (r *Repository) List(ctx context.Context, page, limit int) ([]Hotel, error) {
	return r.ListFiltered(ctx, page, limit, "", 0, "")
}
func (r *Repository) ListFiltered(ctx context.Context, page, limit int, query string, rank int, actor string) ([]Hotel, error) {
	return r.Search(ctx, page, limit, query, rank, actor, "", "", 1, 1)
}
func (r *Repository) Search(ctx context.Context, page, limit int, query string, rank int, actor, from, to string, rooms, guests int) ([]Hotel, error) {
	items := make([]Hotel, 0)
	db := r.db.WithContext(ctx)
	if query != "" {
		db = db.Where("name ILIKE ? OR city ILIKE ? OR country ILIKE ?", "%"+query+"%", "%"+query+"%", "%"+query+"%")
	}
	if rank > 0 {
		db = db.Where("rank = ?", rank)
	}
	if actor != "" {
		db = db.Where("EXISTS (SELECT 1 FROM hotel_members hm WHERE hm.hotel_id = hotels.id AND hm.user_id = ?) OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ? AND r.name = 'admin')", actor, actor)
	}
	if from != "" {
		start, _ := time.Parse("2006-01-02", from)
		end, _ := time.Parse("2006-01-02", to)
		nights := int(end.Sub(start).Hours() / 24)
		db = db.Where("EXISTS (SELECT 1 FROM room_types rt JOIN inventories i ON i.room_type_id = rt.id WHERE rt.hotel_id = hotels.id AND rt.active = true AND rt.capacity * ? >= ? AND i.date >= ? AND i.date < ? AND i.capacity - i.reserved >= ? GROUP BY rt.id HAVING COUNT(*) = ?)", rooms, guests, from, to, rooms, nights)
	}
	if err := db.Order("created_at DESC, id ASC").Offset((page - 1) * limit).Limit(limit).Find(&items).Error; err != nil {
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
