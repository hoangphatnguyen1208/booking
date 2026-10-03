package hotel

type Hotel struct {
	ID      string `json:"id" gorm:"type:auto_increment;primaryKey"`

	Name    string `json:"name" gorm:"type:varchar(100);not null"`
	Address string `json:"address" gorm:"type:varchar(255)"`
	City	string `json:"city" gorm:"type:varchar(100);not null"`

	CreatedAt string `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt string `json:"updated_at" gorm:"autoUpdateTime"`
}