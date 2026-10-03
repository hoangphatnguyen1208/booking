package identity

type User struct {
	ID       string `json:"id" gorm:"type:auto_increment;primaryKey"`
	Email    string `json:"email" gorm:"type:varchar(255);not null;unique"`
	HashedPassword string `json:"hashed_password" gorm:"type:varchar(255);not null"`

	CreatedAt string `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt string `json:"updated_at" gorm:"autoUpdateTime"`
}