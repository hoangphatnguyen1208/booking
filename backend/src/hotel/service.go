package hotel

import "context"

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }
func (s *Service) Create(ctx context.Context, req *CreateRequest) (*Hotel, error) {
	hotel := &Hotel{Name: req.Name, Slug: req.Slug, Address: req.Address, City: req.City, Country: req.Country, Rank: req.Rank}
	return s.repo.Create(ctx, hotel)
}
func (s *Service) Update(ctx context.Context, id string, req *UpdateRequest) (*Hotel, error) {
	hotel := &Hotel{Name: req.Name, Slug: req.Slug, Address: req.Address, City: req.City, Country: req.Country, Rank: req.Rank}
	return s.repo.Update(ctx, id, hotel)
}
func (s *Service) Delete(ctx context.Context, id string) error {
	hotel, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	return s.repo.Delete(ctx, hotel)
}
func (s *Service) FindByID(ctx context.Context, id string) (*Hotel, error) {
	return s.repo.FindByID(ctx, id)
}
func (s *Service) FindBySlug(ctx context.Context, slug string) (*Hotel, error) {
	return s.repo.FindBySlug(ctx, slug)
}
