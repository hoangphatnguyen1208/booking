package middleware

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"sync"
	"time"
)

func AuthLimit() gin.HandlerFunc {
	type bucket struct {
		count int
		until time.Time
	}
	var lock sync.Mutex
	entries := map[string]bucket{}
	return func(c *gin.Context) {
		if c.Request.Method != "POST" || (c.Request.URL.Path != "/api/v1/auth/login" && c.Request.URL.Path != "/api/v1/auth/register" && c.Request.URL.Path != "/api/v1/auth/token") {
			c.Next()
			return
		}
		lock.Lock()
		now := time.Now()
		if len(entries) > 10000 {
			for key, item := range entries {
				if now.After(item.until) {
					delete(entries, key)
				}
			}
		}
		key := c.ClientIP()
		item := entries[key]
		if now.After(item.until) {
			item = bucket{until: now.Add(time.Minute)}
		}
		item.count++
		entries[key] = item
		lock.Unlock()
		if item.count > 30 {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(429, gin.H{"error": "Too many authentication attempts"})
			return
		}
		c.Next()
	}
}
func BodyLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1024*1024)
		c.Next()
	}
}
