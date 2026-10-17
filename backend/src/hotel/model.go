package hotel

import (
	"gorm.io/gorm"
	"time"
)

type Hotel struct {
	ID string `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`

	Name    string `json:"name" gorm:"type:varchar(100);not null"`
	Slug    string `json:"slug" gorm:"type:varchar(100);not null;uniqueIndex"`
	Address string `json:"address" gorm:"type:varchar(255)"`
	City    string `json:"city" gorm:"type:varchar(100);not null"`

	Country   string   `json:"country" gorm:"type:varchar(100);not null"`
	Rank      uint     `json:"rank" gorm:"type:smallint;not null"`
	ImageURL  string   `json:"image_url" gorm:"type:text;not null;default:''"`
	Amenities []string `json:"amenities" gorm:"type:jsonb;serializer:json;not null;default:'[]'"`

	CreatedAt time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}
