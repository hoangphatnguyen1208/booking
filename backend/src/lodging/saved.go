package lodging

import (
	"context"
	"github.com/gin-gonic/gin"
)

// SavedHotels only returns IDs belonging to the authenticated actor.
func (s *Service) SavedHotels(ctx context.Context, actor string) ([]string, error) {
	ids := []string{}
	err := s.DB.WithContext(ctx).Table("saved_hotels").Joins("JOIN hotels ON hotels.id = saved_hotels.hotel_id AND hotels.deleted_at IS NULL").Where("saved_hotels.user_id = ?", actor).
		Order("saved_hotels.created_at, saved_hotels.hotel_id").Pluck("saved_hotels.hotel_id", &ids).Error
	return ids, err
}

func (s *Service) SaveHotel(ctx context.Context, actor, id string) error {
	if err := requireHotel(ctx, s.DB, id); err != nil {
		return err
	}
	return s.DB.WithContext(ctx).Exec("INSERT INTO saved_hotels (user_id, hotel_id) VALUES (?, ?) ON CONFLICT DO NOTHING", actor, id).Error
}

func (s *Service) UnsaveHotel(ctx context.Context, actor, id string) error {
	return s.DB.WithContext(ctx).Exec("DELETE FROM saved_hotels WHERE user_id = ? AND hotel_id = ?", actor, id).Error
}

func (s *Service) registerSaved(api *gin.RouterGroup, auth gin.HandlerFunc) {
	api.GET("/me/saved-hotels", auth, func(c *gin.Context) {
		ids, err := s.SavedHotels(c.Request.Context(), c.GetString("user_id"))
		respond(c, ids, err, 200)
	})
	api.PUT("/me/saved-hotels/:id", auth, func(c *gin.Context) {
		if !IDs(c) {
			return
		}
		err := s.SaveHotel(c.Request.Context(), c.GetString("user_id"), c.Param("id"))
		respond(c, gin.H{"message": "Hotel saved"}, err, 200)
	})
	api.DELETE("/me/saved-hotels/:id", auth, func(c *gin.Context) {
		if !IDs(c) {
			return
		}
		err := s.UnsaveHotel(c.Request.Context(), c.GetString("user_id"), c.Param("id"))
		respond(c, gin.H{"message": "Hotel unsaved"}, err, 200)
	})
}
