package hotel

import (
	"context"
	"errors"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"
)

var ErrInvalidHotel = errors.New("invalid hotel details")
var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

func validateHotel(h *Hotel) error {
	if h.ImageURL != "" {
		u, err := url.Parse(h.ImageURL)
		if err != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || len(h.ImageURL) > 2048 {
			return ErrInvalidHotel
		}
	}
	if len(h.Amenities) > 20 {
		return ErrInvalidHotel
	}
	for _, item := range h.Amenities {
		if strings.TrimSpace(item) == "" || utf8.RuneCountInString(item) > 60 {
			return ErrInvalidHotel
		}
	}
	h.Name = strings.TrimSpace(h.Name)
	h.Slug = strings.TrimSpace(h.Slug)
	h.Address = strings.TrimSpace(h.Address)
	h.City = strings.TrimSpace(h.City)
	h.Country = strings.TrimSpace(h.Country)
	if h.Name == "" || h.City == "" || h.Country == "" || !slugPattern.MatchString(h.Slug) || utf8.RuneCountInString(h.Name) > 100 || len(h.Slug) > 100 || utf8.RuneCountInString(h.Address) > 255 || utf8.RuneCountInString(h.City) > 100 || utf8.RuneCountInString(h.Country) > 100 || h.Rank > 5 {
		return ErrInvalidHotel
	}
	return nil
}

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }
func (s *Service) Search(ctx context.Context, page, limit int, query string, rank int, actor, from, to string, rooms, guests int) ([]Hotel, error) {
	return s.repo.Search(ctx, page, limit, query, rank, actor, from, to, rooms, guests)
}
func (s *Service) List(ctx context.Context, page, limit int) ([]Hotel, error) {
	return s.repo.List(ctx, page, limit)
}
func (s *Service) Create(ctx context.Context, req *CreateRequest) (*Hotel, error) {
	hotel := &Hotel{Name: req.Name, Slug: req.Slug, Address: req.Address, City: req.City, Country: req.Country, Rank: req.Rank, ImageURL: req.ImageURL, Amenities: req.Amenities}
	if err := validateHotel(hotel); err != nil {
		return nil, err
	}
	return s.repo.Create(ctx, hotel)
}
func (s *Service) Update(ctx context.Context, id string, req *UpdateRequest) (*Hotel, error) {
	hotel := &Hotel{Name: req.Name, Slug: req.Slug, Address: req.Address, City: req.City, Country: req.Country, Rank: req.Rank, ImageURL: req.ImageURL, Amenities: req.Amenities}
	if err := validateHotel(hotel); err != nil {
		return nil, err
	}
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
