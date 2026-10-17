package hotel

import (
	"booking/src/permission"
	"context"
	"gorm.io/gorm"
)

func (s *Service) CreateForActor(ctx context.Context, actor string, req *CreateRequest) (*Hotel, error) {
	if req == nil {
		return nil, ErrInvalidHotel
	}
	if err := validateHotel(&Hotel{Name: req.Name, Slug: req.Slug, Address: req.Address, City: req.City, Country: req.Country, Rank: req.Rank}); err != nil {
		return nil, err
	}
	var result *Hotel
	err := s.repo.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		h, err := NewService(NewRepository(tx)).Create(ctx, req)
		if err != nil {
			return err
		}
		if err = tx.Create(&permission.HotelMember{HotelID: h.ID, UserID: actor, Role: "owner"}).Error; err != nil {
			return err
		}
		result = h
		return nil
	})
	return result, err
}
func (s *Service) UpdateForActor(ctx context.Context, actor, id string, req *UpdateRequest) (*Hotel, error) {
	if err := permission.New(s.repo.db).Require(ctx, actor, id, "edit"); err != nil {
		return nil, err
	}
	return s.Update(ctx, id, req)
}
func (s *Service) DeleteForActor(ctx context.Context, actor, id string) error {
	if err := permission.New(s.repo.db).Require(ctx, actor, id, "delete"); err != nil {
		return err
	}
	return s.Delete(ctx, id)
}
