package lodging

import (
	"booking/src/hotel"
	"booking/src/permission"
	"context"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Room returns a publicly visible active room type.
// @Summary Get room type
// @Tags Rooms
// @Produce json
// @Param id path string true "Room type UUID"
// @Success 200 {object} RoomType
// @Router /room-types/{id} [get]
func (s *Service) Room(ctx context.Context, id string) (*RoomType, error) {
	var room RoomType
	if err := s.DB.WithContext(ctx).First(&room, "id = ? AND active = ?", id, true).Error; err != nil {
		return nil, dbError(err)
	}
	var h hotel.Hotel
	if err := s.DB.WithContext(ctx).First(&h, "id = ?", room.HotelID).Error; err != nil {
		return nil, dbError(err)
	}
	return &room, nil
}

// DeactivateRoom preserves booking history.
// @Summary Stop selling room type
// @Tags Rooms
// @Security OAuth2Password
// @Produce json
// @Param id path string true "Room type UUID"
// @Success 200 {object} map[string]string
// @Router /room-types/{id} [delete]
func (s *Service) DeactivateRoom(ctx context.Context, actor, id string) error {
	return s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var room RoomType
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&room, "id = ?", id).Error; err != nil {
			return dbError(err)
		}
		if err := permission.New(tx).Require(ctx, actor, room.HotelID, "edit"); err != nil {
			return err
		}
		return tx.Model(&room).Update("active", false).Error
	})
}
func (s *Service) registerRoomDetail(api *gin.RouterGroup, auth gin.HandlerFunc) {
	api.GET("/room-types/:id", func(c *gin.Context) {
		if !IDs(c) {
			return
		}
		row, err := s.Room(c.Request.Context(), c.Param("id"))
		respond(c, row, err, 200)
	})
	api.DELETE("/room-types/:id", auth, func(c *gin.Context) {
		if !IDs(c) {
			return
		}
		err := s.DeactivateRoom(c.Request.Context(), c.GetString("user_id"), c.Param("id"))
		respond(c, gin.H{"message": "Room type deactivated"}, err, 200)
	})
}
