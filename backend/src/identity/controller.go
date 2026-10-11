package identity

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Controller struct {
	service *Service
}

func NewController(service *Service) *Controller {
	return &Controller{service: service}
}

func (c *Controller) RegisterRoutes(router *gin.RouterGroup, RequireAuth gin.HandlerFunc) {
	auth := router.Group("/auth")
	{
		auth.POST("/register", c.Register)
		auth.POST("/login", c.Login)
		auth.POST("/token", c.Token)

		auth.GET("/me", RequireAuth, c.Me)
	}
}

// Token godoc
// @Summary Get a token using the standard Swagger login form
// @Tags Auth
// @Accept x-www-form-urlencoded
// @Produce json
// @Param grant_type formData string true "Grant type" Enums(password)
// @Param username formData string true "Account email"
// @Param password formData string true "Password"
// @Success 200 {object} LoginResponse
// @Failure 400 {object} OAuthErrorResponse
// @Failure 500 {object} OAuthErrorResponse
// @Router /auth/token [post]
func (c *Controller) Token(ctx *gin.Context) {
	ctx.Header("Cache-Control", "no-store")
	ctx.Header("Pragma", "no-cache")
	ctx.Request.Body = http.MaxBytesReader(ctx.Writer, ctx.Request.Body, 16*1024)
	var req TokenRequest
	if err := ctx.ShouldBind(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, OAuthErrorResponse{Error: "invalid_request"})
		return
	}
	if req.GrantType != "password" {
		ctx.JSON(http.StatusBadRequest, OAuthErrorResponse{Error: "unsupported_grant_type"})
		return
	}
	result, err := c.service.Login(ctx.Request.Context(), LoginRequest{Email: req.Username, Password: req.Password})
	if errors.Is(err, ErrInvalidCredentials) {
		ctx.JSON(http.StatusBadRequest, OAuthErrorResponse{Error: "invalid_grant", ErrorDescription: "Invalid email or password"})
		return
	}
	if err != nil {
		log.Printf("token endpoint: %v", err)
		ctx.JSON(http.StatusInternalServerError, OAuthErrorResponse{Error: "server_error"})
		return
	}
	ctx.JSON(http.StatusOK, result)
}

// Register godoc
// @Summary Register an account
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration details"
// @Success 200 {object} User
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /auth/register [post]
func (c *Controller) Register(ctx *gin.Context) {
	var req RegisterRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := c.service.Register(ctx.Request.Context(), req)
	if errors.Is(err, ErrInvalidPassword) {
		ctx.JSON(http.StatusBadRequest, ErrorResponse{
			Error: "Invalid password",
		})
		return
	}

	if errors.Is(err, ErrEmailExists) {
		ctx.JSON(http.StatusConflict, ErrorResponse{
			Error: "Email already exists",
		})
		return
	}

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal server error"})
		return
	}

	ctx.JSON(http.StatusOK, user)
}

// Login godoc
// @Summary Sign in and receive a JWT
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} LoginResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /auth/login [post]
func (c *Controller) Login(ctx *gin.Context) {
	var req LoginRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := c.service.Login(ctx.Request.Context(), req)
	if errors.Is(err, ErrInvalidCredentials) {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid credentials"})
		return
	}

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal server error"})
		return
	}

	ctx.JSON(http.StatusOK, user)
}

// Me godoc
// @Summary Get current user
// @Tags Auth
// @Accept json
// @Produce json
// @Success 200 {object} LoginResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /auth/me [get]
func (c *Controller) Me(ctx *gin.Context) {
	userId := ctx.MustGet("user_id").(string)
	user, err := c.service.Me(ctx.Request.Context(), userId)
	if errors.Is(err, ErrUserNotFound) {
		ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "User not found"})
		return
	}
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal server error"})
		return
	}
	ctx.JSON(http.StatusOK, user)
}
