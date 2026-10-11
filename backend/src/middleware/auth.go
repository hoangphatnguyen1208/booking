package middleware

import (
	"booking/src/identity"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func RequireAuth(
	tokens *identity.TokenManager,
) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		parts := strings.Fields(ctx.Request.Header.Get("Authorization"))

		if len(parts) != 2 || parts[0] != "Bearer" {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Bearer token required",
			})
			return
		}

		userID, err := tokens.ValidateToken(parts[1])
		if err != nil {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token",
			})
			return
		}

		ctx.Set("user_id", userID)

		ctx.Next()
	}
}
