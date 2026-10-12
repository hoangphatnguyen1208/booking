package hotel

import (
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
	"regexp"
	"strconv"
)

type Controller struct{ service *Service }

func NewCController(service *Service) *Controller { return &Controller{service: service} }
func (c *Controller) RegisterRoutes(api *gin.RouterGroup, requireAuth gin.HandlerFunc) {
	routes := api.Group("/hotels")
	routes.GET("", c.List)
	routes.GET("/:id", c.FindByID)
	routes.POST("", requireAuth, c.Create)
	routes.PUT("/:id", requireAuth, c.Update)
	routes.DELETE("/:id", requireAuth, c.Delete)
}

var uuidPattern = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// List godoc
// @Summary List hotels
// @Tags Hotels
// @Produce json
// @Param page query int false "Page" default(1)
// @Param limit query int false "Page size, maximum 100" default(20)
// @Success 200 {object} ListResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /hotels [get]
func (c *Controller) List(ctx *gin.Context) {
	page, err := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	limit, limitErr := strconv.Atoi(ctx.DefaultQuery("limit", "20"))
	if err != nil || limitErr != nil || page < 1 || page > 1000000 || limit < 1 || limit > 100 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid pagination"})
		return
	}
	items, err := c.service.List(ctx.Request.Context(), page, limit)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	ctx.JSON(http.StatusOK, ListResponse{Items: items, Page: page, Limit: limit})
}

func validID(ctx *gin.Context) bool {
	if !uuidPattern.MatchString(ctx.Param("id")) {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid hotel ID"})
		return false
	}
	return true
}

// Create godoc
// @Summary Create hotel
// @Tags Hotels
// @Accept json
// @Produce json
// @Security OAuth2Password
// @Param request body CreateRequest true "Hotel details"
// @Success 201 {object} Hotel
// @Router /hotels [post]
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 409 {object} map[string]string
// @Failure 500 {object} map[string]string
func (c *Controller) Create(ctx *gin.Context) {
	var req CreateRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	hotel, err := c.service.Create(ctx.Request.Context(), &req)
	if err != nil {
		if errors.Is(err, ErrInvalidHotel) {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid hotel details"})
			return
		}
		if errors.Is(err, ErrSlugExists) {
			ctx.JSON(http.StatusConflict, gin.H{"error": "Slug already exists"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}
	ctx.JSON(http.StatusCreated, hotel)
}

// Update godoc
// @Summary Replace all editable hotel fields
// @Tags Hotels
// @Accept json
// @Produce json
// @Security OAuth2Password
// @Param id path string true "Hotel UUID"
// @Param request body UpdateRequest true "Complete hotel details"
// @Success 200 {object} Hotel
// @Router /hotels/{id} [put]
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 409 {object} map[string]string
// @Failure 500 {object} map[string]string
func (c *Controller) Update(ctx *gin.Context) {
	if !validID(ctx) {
		return
	}
	var req UpdateRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	hotel, err := c.service.Update(ctx.Request.Context(), ctx.Param("id"), &req)
	if err != nil {
		if errors.Is(err, ErrInvalidHotel) {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid hotel details"})
			return
		}
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

// Delete godoc
// @Summary Delete hotel
// @Tags Hotels
// @Produce json
// @Security OAuth2Password
// @Param id path string true "Hotel UUID"
// @Success 200 {object} map[string]string
// @Router /hotels/{id} [delete]
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 409 {object} map[string]string
// @Failure 500 {object} map[string]string
func (c *Controller) Delete(ctx *gin.Context) {
	if !validID(ctx) {
		return
	}
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

// FindByID godoc
// @Summary Get hotel
// @Tags Hotels
// @Produce json
// @Param id path string true "Hotel UUID"
// @Success 200 {object} Hotel
// @Router /hotels/{id} [get]
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 409 {object} map[string]string
// @Failure 500 {object} map[string]string
func (c *Controller) FindByID(ctx *gin.Context) {
	if !validID(ctx) {
		return
	}
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
