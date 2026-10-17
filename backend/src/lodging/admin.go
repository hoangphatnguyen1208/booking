package lodging

import (
	"booking/src/identity"
	"booking/src/permission"
	"context"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (s *Service) SetAdmin(ctx context.Context, actor, userID string, enabled bool) error {
	return s.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var role identity.Role
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&role, "name = ?", "admin").Error; err != nil {
			return err
		}
		yes, err := permission.New(tx).IsAdmin(ctx, actor)
		if err != nil {
			return err
		}
		if !yes {
			return permission.ErrForbidden
		}
		var user identity.User
		if err := tx.First(&user, "id = ?", userID).Error; err != nil {
			return dbError(err)
		}
		if enabled {
			return tx.Exec("INSERT INTO user_roles(user_id,role_id) VALUES (?,?) ON CONFLICT DO NOTHING", userID, role.ID).Error
		}
		var count int64
		if err := tx.Table("user_roles").Where("role_id = ?", role.ID).Count(&count).Error; err != nil {
			return err
		}
		var memberCount int64
		if err := tx.Table("user_roles").Where("user_id = ? AND role_id = ?", userID, role.ID).Count(&memberCount).Error; err != nil {
			return err
		}
		if count <= 1 && memberCount > 0 {
			return fail(409, "Cannot remove the last admin")
		}
		return tx.Exec("DELETE FROM user_roles WHERE user_id = ? AND role_id = ?", userID, role.ID).Error
	})
}
func (s *Service) registerAdmin(api *gin.RouterGroup, auth gin.HandlerFunc) {
	api.PUT("/admin/users/:id/admin", auth, func(c *gin.Context) {
		if !IDs(c) {
			return
		}
		var in struct {
			Enabled *bool `json:"enabled" binding:"required"`
		}
		if c.ShouldBindJSON(&in) != nil {
			c.JSON(400, gin.H{"error": "Invalid role"})
			return
		}
		err := s.SetAdmin(c.Request.Context(), c.GetString("user_id"), c.Param("id"), *in.Enabled)
		respond(c, gin.H{"message": "Role updated"}, err, 200)
	})
	api.GET("/admin/audit-logs", auth, func(c *gin.Context) {
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
		var rows []map[string]any
		err = s.DB.WithContext(c.Request.Context()).Table("audit_logs").Order("id DESC").Limit(50).Offset((page - 1) * 50).Find(&rows).Error
		if rows == nil {
			rows = []map[string]any{}
		}
		respond(c, rows, err, 200)
	})
	api.POST("/bookings/:id/complete", auth, func(c *gin.Context) {
		if !IDs(c) {
			return
		}
		err := s.Complete(c.Request.Context(), c.GetString("user_id"), c.Param("id"))
		respond(c, gin.H{"message": "Booking completed"}, err, 200)
	})
}
