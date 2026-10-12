package hotel

import "time"

type ListResponse struct {
	Items []Hotel `json:"items"`
	Page  int     `json:"page"`
	Limit int     `json:"limit"`
}

type CreateRequest struct {
	Name    string `json:"name" binding:"required,max=100"`
	Slug    string `json:"slug" binding:"required,max=100"`
	Address string `json:"address" binding:"max=255"`
	City    string `json:"city" binding:"required,max=100"`
	Country string `json:"country" binding:"required,max=100"`
	Rank    uint   `json:"rank" binding:"lte=5"`
}
type UpdateRequest struct {
	Name    string `json:"name" binding:"required,max=100"`
	Slug    string `json:"slug" binding:"required,max=100"`
	Address string `json:"address" binding:"max=255"`
	City    string `json:"city" binding:"required,max=100"`
	Country string `json:"country" binding:"required,max=100"`
	Rank    uint   `json:"rank" binding:"lte=5"`
}
type Response struct {
	ID        string    `json:"id"`
	Name      string    `json:"name" binding:"required,max=100"`
	Slug      string    `json:"slug" binding:"required,max=100"`
	Address   string    `json:"address" binding:"max=255"`
	City      string    `json:"city" binding:"required,max=100"`
	Country   string    `json:"country" binding:"required,max=100"`
	Rank      uint      `json:"rank" binding:"lte=5"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
