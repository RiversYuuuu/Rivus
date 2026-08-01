package repository

import (
	"MultiMediaManager/internal/model"

	"gorm.io/gorm"
)

func (r *Repository) CreateAudio(audio *model.Audio) error {
	return r.DB.Create(audio).Error
}

func (r *Repository) SearchAudio(condition model.SearchAudioCondition) ([]model.Audio, error) {
	var audios []model.Audio

	query := r.DB.Model(&model.Audio{})

	query = applySearchCondition(query, condition)

	// 排序条件
	if condition.SortBy != "" {
		query = query.Order(condition.SortBy + " " + condition.SortOrder)
	} else {
		query = query.Order("id DESC")
	}

	// 分页条件
	offset := (condition.Page - 1) * condition.PageSize
	err := query.Offset(offset).Limit(condition.PageSize).Find(&audios).Error

	return audios, err
}

func (r *Repository) CountAudio(condition model.SearchAudioCondition) (int64, error) {
	var count int64

	query := r.DB.Model(&model.Audio{})
	query = applySearchCondition(query, condition)

	err := query.Count(&count).Error

	return count, err
}

func applySearchCondition(query *gorm.DB, condition model.SearchAudioCondition) *gorm.DB {
	var conditions []string
	var args []interface{}

	if condition.Title != "" {
		conditions = append(conditions, "title LIKE ?")
		args = append(args, "%"+condition.Title+"%")
	}
	if condition.Artist != "" {
		conditions = append(conditions, "artist LIKE ?")
		args = append(args, "%"+condition.Artist+"%")
	}
	if condition.Album != "" {
		conditions = append(conditions, "album LIKE ?")
		args = append(args, "%"+condition.Album+"%")
	}
	if condition.MD5 != "" {
		conditions = append(conditions, "md5 = ?")
		args = append(args, condition.MD5)
	}

	if len(conditions) > 0 {
		joined := ""
		for i, c := range conditions {
			if i > 0 {
				joined += " OR "
			}
			joined += "(" + c + ")"
		}
		query = query.Where(joined, args...)
	}

	return query
}

func (r *Repository) SearchAudioFromRecycleBin(condition model.SearchAudioCondition) ([]model.Audio, error) {
	var audios []model.Audio

	query := r.DB.Unscoped().Model(&model.Audio{})

	// 搜索条件
	query = query.Where("deleted_at IS NOT NULL")

	// 排序条件
	if condition.SortBy != "" {
		query = query.Order(condition.SortBy + " " + condition.SortOrder)
	} else {
		query = query.Order("id DESC")
	}

	// 分页条件
	offset := (condition.Page - 1) * condition.PageSize
	err := query.Offset(offset).Limit(condition.PageSize).Find(&audios).Error

	return audios, err
}

func (r *Repository) CountAudioFromRecycleBin(condition model.SearchAudioCondition) (int64, error) {
	var count int64

	query := r.DB.Unscoped().Model(&model.Audio{})

	query = query.Where("deleted_at IS NOT NULL")

	err := query.Count(&count).Error

	return count, err
}

func (r *Repository) GetAudioByID(audioID uint) (*model.Audio, error) {
	var audio model.Audio
	if err := r.DB.Where("ID = ?", audioID).First(&audio).Error; err != nil {
		return nil, err
	}
	return &audio, nil
}

func (r *Repository) UpdateAudio(audio *model.Audio) error {
	return r.DB.Save(audio).Error
}

func (r *Repository) DeleteAudioByID(audioID uint) error {
	return r.DB.Delete(&model.Audio{}, audioID).Error
}

func (r *Repository) RestoreAudioByID(audioID uint) error {
	return r.DB.Unscoped().Model(&model.Audio{}).Where("ID = ?", audioID).Update("deleted_at", nil).Error
}
