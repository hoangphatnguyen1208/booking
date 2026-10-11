package identity

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo   *Repository
	tokens *TokenManager
}

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrInvalidPassword    = errors.New("password must contain at least 8 characters and at most 72 bytes")
)

func NewService(repo *Repository, tokens *TokenManager) *Service {
	return &Service{repo: repo, tokens: tokens}
}

func (s *Service) Register(ctx context.Context, req RegisterRequest) (*User, error) {
	_, err := mail.ParseAddress(req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to parse email: %w", err)
	}

	if utf8.RuneCountInString(req.Password) < 8 || len(req.Password) > 72 {
		return nil, ErrInvalidPassword
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &User{
		Email:          req.Email,
		HashedPassword: string(hashedPassword),
	}

	err = s.repo.Create(ctx, user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *Service) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	if len(req.Password) == 0 || len(req.Password) > 72 {
		return nil, ErrInvalidCredentials
	}
	user, err := s.repo.FindByEmail(ctx, req.Email)
	if errors.Is(err, ErrUserNotFound) {
		return nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, err
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.HashedPassword), []byte(req.Password))
	if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
		return nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, fmt.Errorf("failed to compare password: %w", err)
	}

	token, err := s.tokens.GenerateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &LoginResponse{
		AccessToken: token,
		TokenType:   "Bearer",
		ExpiresIn:   s.tokens.expireTime,
	}, nil
}

func (s *Service) Me(ctx context.Context, id string) (*User, error) {
	return s.repo.FindByID(ctx, id)
}
