package lodging

import (
	"booking/src/permission"
	"errors"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"regexp"
	"strconv"
)

var uuid = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

func IDs(c *gin.Context) bool {
	for _, p := range c.Params {
		if (p.Key == "id" || p.Key == "user") && !uuid.MatchString(p.Value) {
			c.JSON(400, gin.H{"error": "Invalid UUID"})
			return false
		}
	}
	return true
}
func respond(c *gin.Context, result any, err error, status int) {
	if err != nil {
		var failure *Failure
		if errors.As(err, &failure) {
			c.JSON(failure.Status, gin.H{"error": failure.Message})
			return
		}
		if errors.Is(err, permission.ErrForbidden) {
			c.JSON(403, gin.H{"error": "Forbidden"})
			return
		}
		log.Printf("request failed: %v", err)
		c.JSON(500, gin.H{"error": "Internal server error"})
		return
	}
	c.JSON(status, result)
}
func integer(c *gin.Context, key string, fallback int) int {
	value := c.Query(key)
	if value == "" {
		return fallback
	}
	n, err := strconv.Atoi(value)
	if err != nil {
		return -1
	}
	return n
}
func (s *Service) RegisterRoutes(api *gin.RouterGroup, auth gin.HandlerFunc) {
	s.registerManagement(api, auth)
	s.registerAdmin(api, auth)
	s.registerRoomDetail(api, auth)
	api.POST("/bookings", auth, func(c *gin.Context) {
		var input BookingInput
		if c.ShouldBindJSON(&input) != nil {
			c.JSON(400, gin.H{"error": "Invalid booking"})
			return
		}
		row, err := s.Book(c.Request.Context(), c.GetString("user_id"), c.GetHeader("Idempotency-Key"), input)
		respond(c, row, err, 201)
	})
	api.GET("/bookings", auth, func(c *gin.Context) {
		page := integer(c, "page", 1)
		if page < 1 || page > 1000000 {
			c.JSON(400, gin.H{"error": "Invalid page"})
			return
		}
		rows, err := s.MyBookings(c.Request.Context(), c.GetString("user_id"), page)
		respond(c, rows, err, 200)
	})
	api.GET("/bookings/:id", auth, func(c *gin.Context) {
		if !IDs(c) {
			return
		}
		row, err := s.Booking(c.Request.Context(), c.GetString("user_id"), c.Param("id"))
		respond(c, row, err, 200)
	})
	api.POST("/bookings/:id/cancel", auth, func(c *gin.Context) {
		if !IDs(c) {
			return
		}
		row, err := s.Cancel(c.Request.Context(), c.GetString("user_id"), c.Param("id"))
		respond(c, row, err, 200)
	})
	api.GET("/hotels/:id/room-types", func(c *gin.Context) {
		if !IDs(c) {
			return
		}
		rows, err := s.Rooms(c.Request.Context(), c.Param("id"))
		respond(c, rows, err, 200)
	})
	api.POST("/hotels/:id/room-types", auth, func(c *gin.Context) {
		if !IDs(c) {
			return
		}
		var input RoomInput
		if c.ShouldBindJSON(&input) != nil {
			c.JSON(400, gin.H{"error": "Invalid room details"})
			return
		}
		row, err := s.SaveRoom(c.Request.Context(), c.GetString("user_id"), c.Param("id"), "", input)
		respond(c, row, err, 201)
	})
	api.PUT("/room-types/:id", auth, func(c *gin.Context) {
		if !IDs(c) {
			return
		}
		var input RoomInput
		if c.ShouldBindJSON(&input) != nil {
			c.JSON(400, gin.H{"error": "Invalid room details"})
			return
		}
		row, err := s.SaveRoom(c.Request.Context(), c.GetString("user_id"), "", c.Param("id"), input)
		respond(c, row, err, 200)
	})
	api.GET("/room-types/:id/inventory", auth, func(c *gin.Context) {
		if !IDs(c) {
			return
		}
		rows, err := s.Inventory(c.Request.Context(), c.GetString("user_id"), c.Param("id"), c.Query("from"), c.Query("to"))
		respond(c, rows, err, 200)
	})
	api.PUT("/room-types/:id/inventory", auth, func(c *gin.Context) {
		if !IDs(c) {
			return
		}
		var input InventoryInput
		if c.ShouldBindJSON(&input) != nil {
			c.JSON(400, gin.H{"error": "Invalid inventory"})
			return
		}
		err := s.PutInventory(c.Request.Context(), c.GetString("user_id"), c.Param("id"), input)
		respond(c, gin.H{"message": "Inventory updated"}, err, 200)
	})
	api.GET("/hotels/:id/availability", func(c *gin.Context) {
		if !IDs(c) {
			return
		}
		rows, err := s.Availability(c.Request.Context(), c.Param("id"), c.Query("check_in"), c.Query("check_out"), integer(c, "rooms", 1), integer(c, "guests", 2))
		respond(c, rows, err, http.StatusOK)
	})
}
