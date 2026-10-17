package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"log"
	"time"
)

type AuditLog struct {
	ID        uint64
	UserID    *string
	Method    string
	Path      string
	Status    int
	CreatedAt time.Time
}

func Audit(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		value := make([]byte, 12)
		_, _ = rand.Read(value)
		c.Header("X-Request-ID", hex.EncodeToString(value))
		c.Next()
		if c.Request.Method == "GET" || c.Request.Method == "OPTIONS" {
			return
		}
		var actor *string
		if id := c.GetString("user_id"); id != "" {
			actor = &id
		}
		if err := db.Create(&AuditLog{UserID: actor, Method: c.Request.Method, Path: c.Request.URL.Path, Status: c.Writer.Status(), CreatedAt: time.Now().UTC()}).Error; err != nil {
			log.Printf("audit write failed")
		}
	}
}
