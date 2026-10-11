package hotel

import "time"

type CreateRequest struct {
	Name    string `json:"name"`
	Slug    string `json:"slug"`
	Address string `json:"address"`
	City    string `json:"city"`
	Country string `json:"country"`
	Rank    uint   `json:"rank"`
}
type UpdateRequest struct {
	Name    string `json:"name"`
	Slug    string `json:"slug"`
	Address string `json:"address"`
	City    string `json:"city"`
	Country string `json:"country"`
	Rank    uint   `json:"rank"`
}
type Response struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Address   string    `json:"address"`
	City      string    `json:"city"`
	Country   string    `json:"country"`
	Rank      uint      `json:"rank"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
