package identity

import "time"

type User struct {
    ID             string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    Email          string    `json:"email" gorm:"type:varchar(255);not null;uniqueIndex"`
    HashedPassword string    `json:"-" gorm:"type:text;not null"`
    CreatedAt      time.Time `json:"created_at" gorm:"not null"`
    UpdatedAt      time.Time `json:"updated_at" gorm:"not null"`
}

