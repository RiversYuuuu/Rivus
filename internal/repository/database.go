package repository

import (
	"Rivus/internal/model"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

type Repository struct {
	DB *gorm.DB
}

func NewRepository(dbPath string) (*Repository, error) {
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	db.AutoMigrate(&model.Config{})
	db.AutoMigrate(&model.Audio{})
	db.AutoMigrate(&model.Image{})
	db.AutoMigrate(&model.Video{})

	return &Repository{DB: db}, nil
}
