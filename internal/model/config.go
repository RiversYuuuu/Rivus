package model

type Config struct {
	ID             uint `gorm:"primaryKey"`
	AudioDir       string
	AcoustIDApiKey string `gorm:"size:64"`
	ImageDir       string
}

func (Config) TableName() string {
	return "config"
}
