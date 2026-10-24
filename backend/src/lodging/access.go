package lodging

import (
	"booking/src/permission"
	"github.com/gin-gonic/gin"
)

func (s *Service) AccessHTTP(c *gin.Context) {
	actor := c.GetString("user_id")
	admin, err := permission.New(s.DB).IsAdmin(c.Request.Context(), actor)
	if err != nil {
		respond(c, nil, err, 200)
		return
	}
	members := []permission.HotelMember{}
	err = s.DB.WithContext(c.Request.Context()).Where("user_id = ?", actor).Find(&members).Error
	respond(c, gin.H{"admin": admin, "hotels": members}, err, 200)
}
