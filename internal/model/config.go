package model

type Config struct {
	ID             uint   `gorm:"primaryKey"`
	AudioDir       string `gorm:"not null"`
	AcoustIDApiKey string `gorm:"size:64"`
}

func (Config) TableName() string {
	return "config"
}
