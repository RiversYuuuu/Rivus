package model

// Config 数据库模型
type Config struct {
	ID       uint   `gorm:"primaryKey"`
	AudioDir string `gorm:"not null"`
}

func (Config) TableName() string {
	return "config"
}
