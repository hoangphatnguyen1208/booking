package hotel

import (
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
)

type Controller struct{ service *Service }

func NewCController(service *Service) *Controller { return &Controller{service: service} }
func (c *Controller) Create(ctx *gin.Context) {
	var req CreateRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	hotel, err := c.service.Create(ctx.Request.Context(), &req)
	if err != nil {
		if errors.Is(err, ErrSlugExists) {
			ctx.JSON(http.StatusConflict, gin.H{"error": "Slug already exists"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	ctx.JSON(http.StatusCreated, hotel)
}
func (c *Controller) Update(ctx *gin.Context) {
	var req UpdateRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	hotel, err := c.service.Update(ctx.Request.Context(), ctx.Param("id"), &req)
	if err != nil {
		if errors.Is(err, ErrSlugExists) {
			ctx.JSON(http.StatusConflict, gin.H{"error": "Slug already exists"})
			return
		}
		if errors.Is(err, ErrHotelNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Hotel not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	ctx.JSON(http.StatusOK, hotel)
}
func (c *Controller) Delete(ctx *gin.Context) {
	if err := c.service.Delete(ctx.Request.Context(), ctx.Param("id")); err != nil {
		if errors.Is(err, ErrHotelNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Hotel not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "Hotel deleted successfully"})
}
func (c *Controller) FindByID(ctx *gin.Context) {
	hotel, err := c.service.FindByID(ctx.Request.Context(), ctx.Param("id"))
	if err != nil {
		if errors.Is(err, ErrHotelNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": "Hotel not found"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	ctx.JSON(http.StatusOK, hotel)
}
