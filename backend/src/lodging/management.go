package lodging

import (
	"booking/src/hotel"
	"booking/src/identity"
	"booking/src/permission"
	"context"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"strings"
)

func (s *Service) membership(ctx context.Context, actor, hotelID, email, role string, remove bool) error {
	return s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var h hotel.Hotel
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&h, "id = ?", hotelID).Error; err != nil {
			return dbError(err)
		}
		if err := permission.New(tx).Require(ctx, actor, hotelID, "members"); err != nil {
			return err
		}
		var user identity.User
		if err := tx.First(&user, "LOWER(email) = ?", strings.ToLower(strings.TrimSpace(email))).Error; err != nil {
			return fail(404, "User not found")
		}
		var member permission.HotelMember
		tx.First(&member, "hotel_id = ? AND user_id = ?", hotelID, user.ID)
		if member.Role == "owner" && (remove || role != "owner") {
			var count int64
			if err := tx.Model(&permission.HotelMember{}).Where("hotel_id = ? AND role = ?", hotelID, "owner").Count(&count).Error; err != nil {
				return err
			}
			if count <= 1 {
				return fail(409, "Cannot remove the last owner")
			}
		}
		if remove {
			return tx.Delete(&permission.HotelMember{}, "hotel_id = ? AND user_id = ?", hotelID, user.ID).Error
		}
		return tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "hotel_id"}, {Name: "user_id"}}, DoUpdates: clause.AssignmentColumns([]string{"role"})}).Create(&permission.HotelMember{HotelID: hotelID, UserID: user.ID, Role: role}).Error
	})
}
func (s *Service) registerManagement(api *gin.RouterGroup, auth gin.HandlerFunc) {
	api.GET("/hotels/:id/members", auth, s.ListMembersHTTP)
	api.PUT("/hotels/:id/members", auth, s.UpdateMembersHTTP)
	api.GET("/hotels/:id/manage-rooms", auth, s.ManagedRoomsHTTP)
	api.GET("/hotels/:id/bookings", auth, s.HotelBookingsHTTP)
	api.GET("/admin/users", auth, s.AdminUsersHTTP)
}

// ListMembersHTTP handles List hotel members.
// @Summary List hotel members
// @Tags Management
// @Security OAuth2Password
// @Produce json
// @Param id path string true "Resource UUID"
// @Success 200 {array} MemberRow
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /hotels/{id}/members [get]
func (s *Service) ListMembersHTTP(c *gin.Context) {
	if !IDs(c) {
		return
	}
	if err := permission.New(s.DB).Require(c.Request.Context(), c.GetString("user_id"), c.Param("id"), "members"); err != nil {
		respond(c, nil, err, 200)
		return
	}
	rows := []MemberRow{}
	err := s.DB.WithContext(c.Request.Context()).Table("hotel_members hm").Select("hm.user_id, users.email, hm.role").Joins("JOIN users ON users.id = hm.user_id").Where("hm.hotel_id = ?", c.Param("id")).Order("users.email").Scan(&rows).Error
	respond(c, rows, err, 200)
}

// UpdateMembersHTTP handles Set or remove hotel membership.
// @Summary Set or remove hotel membership
// @Tags Management
// @Security OAuth2Password
// @Produce json
// @Param id path string true "Resource UUID"
// @Accept json
// @Param request body MemberInput true "Request fields"
// @Success 200 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /hotels/{id}/members [put]
func (s *Service) UpdateMembersHTTP(c *gin.Context) {
	if !IDs(c) {
		return
	}
	var input MemberInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(400, gin.H{"error": "Invalid member"})
		return
	}
	err := s.membership(c.Request.Context(), c.GetString("user_id"), c.Param("id"), input.Email, input.Role, input.Role == "remove")
	respond(c, gin.H{"message": "Membership updated"}, err, 200)
}

// ManagedRoomsHTTP handles List room types including inactive rooms.
// @Summary List room types including inactive rooms
// @Tags Management
// @Security OAuth2Password
// @Produce json
// @Param id path string true "Resource UUID"
// @Success 200 {array} RoomType
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /hotels/{id}/manage-rooms [get]
func (s *Service) ManagedRoomsHTTP(c *gin.Context) {
	if !IDs(c) {
		return
	}
	if err := permission.New(s.DB).Require(c.Request.Context(), c.GetString("user_id"), c.Param("id"), "edit"); err != nil {
		respond(c, nil, err, 200)
		return
	}
	rows := []RoomType{}
	err := s.DB.WithContext(c.Request.Context()).Where("hotel_id = ?", c.Param("id")).Order("created_at,id").Find(&rows).Error
	respond(c, rows, err, 200)
}

// HotelBookingsHTTP handles List hotel bookings.
// @Summary List hotel bookings
// @Tags Management
// @Security OAuth2Password
// @Produce json
// @Param id path string true "Resource UUID"
// @Param page query int false "Page" default(1)
// @Success 200 {array} Booking
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /hotels/{id}/bookings [get]
func (s *Service) HotelBookingsHTTP(c *gin.Context) {
	if !IDs(c) {
		return
	}
	if err := permission.New(s.DB).Require(c.Request.Context(), c.GetString("user_id"), c.Param("id"), "bookings"); err != nil {
		respond(c, nil, err, 200)
		return
	}
	page := integer(c, "page", 1)
	if page < 1 || page > 1000000 {
		c.JSON(400, gin.H{"error": "Invalid page"})
		return
	}
	rows := []Booking{}
	err := s.DB.WithContext(c.Request.Context()).Where("hotel_id = ?", c.Param("id")).Order("created_at DESC,id").Offset((page - 1) * 20).Limit(20).Find(&rows).Error
	respond(c, rows, err, 200)
}

// AdminUsersHTTP handles List users and roles.
// @Summary List users and roles
// @Tags Admin
// @Security OAuth2Password
// @Produce json
// @Param page query int false "Page" default(1)
// @Success 200 {array} identity.User
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /admin/users [get]
func (s *Service) AdminUsersHTTP(c *gin.Context) {
	yes, err := permission.New(s.DB).IsAdmin(c.Request.Context(), c.GetString("user_id"))
	if err != nil {
		respond(c, nil, err, 200)
		return
	}
	if !yes {
		respond(c, nil, permission.ErrForbidden, 200)
		return
	}
	page := integer(c, "page", 1)
	if page < 1 || page > 1000000 {
		c.JSON(400, gin.H{"error": "Invalid page"})
		return
	}
	rows := []identity.User{}
	err = s.DB.WithContext(c.Request.Context()).Preload("Roles").Order("created_at,id").Offset((page - 1) * 20).Limit(20).Find(&rows).Error
	respond(c, rows, err, 200)
}
