package repository

import "MultiMediaManager/internal/model"

func (r *Repository) GetConfig() (*model.Config, error) {
	var config model.Config
	err := r.DB.First(&config).Error
	return &config, err
}

func (r *Repository) UpdateConfig(config *model.Config) error {
	var existing model.Config
	if err := r.DB.First(&existing).Error; err != nil {
		// 配置不存在，创建新配置
		return r.DB.Create(&config).Error
	}

	return r.DB.Model(&existing).Updates(config).Error
}
