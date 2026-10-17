package middleware

import (
	"booking/src/identity"
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
	"strings"
)

// Production passes a repository; isolated JWT tests may omit it.
func RequireAuth(tokens *identity.TokenManager, repositories ...*identity.Repository) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		parts := strings.Fields(ctx.GetHeader("Authorization"))
		if len(parts) != 2 || parts[0] != "Bearer" {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Bearer token required"})
			return
		}
		userID, err := tokens.ValidateToken(parts[1])
		if err != nil {
			ctx.AbortWithStatusJSON(401, gin.H{"error": "Invalid token"})
			return
		}
		if len(repositories) > 0 && repositories[0] != nil {
			user, err := repositories[0].FindByID(ctx.Request.Context(), userID)
			if errors.Is(err, identity.ErrUserNotFound) {
				ctx.AbortWithStatusJSON(401, gin.H{"error": "User not found"})
				return
			}
			if err != nil {
				ctx.AbortWithStatusJSON(500, gin.H{"error": "Internal server error"})
				return
			}
			ctx.Set("roles", user.Roles)
		}
		ctx.Set("user_id", userID)
		ctx.Next()
	}
}
