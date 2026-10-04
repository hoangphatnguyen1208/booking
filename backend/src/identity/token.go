package identity

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenManager struct {
	secret string
	expireTime int
}

func NewTokenManager(secret string, expireTime int) *TokenManager {
	return &TokenManager{secret: secret, expireTime: expireTime}
}

func (t *TokenManager) GenerateToken(user *User) (string, error) {
	now := time.Now()

	claims := jwt.RegisteredClaims{
		Subject: user.Email,
		Issuer: "booking-api",
		Audience: jwt.ClaimStrings{"booking-client"},
		IssuedAt: jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(t.expireTime) * time.Second)),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(t.secret))
}

func (t *TokenManager) ValidateToken(tokenString string) (string, error) {
	claims := &jwt.RegisteredClaims{}
	
	token, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(token *jwt.Token) (any, error) {
			return t.secret, nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer("booking-api"),
		jwt.WithAudience("booking-client"),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return "", fmt.Errorf("failed to validate token: %w", err)
	}

	if !token.Valid {
		return "", fmt.Errorf("invalid token")
	}

	if claims.ExpiresAt.Time.Before(time.Now()) {
		return "", fmt.Errorf("token has expired")
	}

	if claims.IssuedAt.Time.After(time.Now()) {
		return "", fmt.Errorf("token is not yet valid")
	}

	return claims.Subject, nil
}