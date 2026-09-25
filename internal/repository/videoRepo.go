package repository

import (
	"Rivus/internal/model"

	"gorm.io/gorm"
)

func (r *Repository) CreateVideo(video *model.Video) error {
	return r.DB.Create(video).Error
}

func (r *Repository) SearchVideo(condition model.SearchVideoCondition) ([]model.Video, error) {
	var videos []model.Video

	query := r.DB.Model(&model.Video{})

	query = applySearchVideoCondition(query, condition)

	// 排序条件
	if condition.SortBy != "" {
		query = query.Order(condition.SortBy + " " + condition.SortOrder)
	} else {
		query = query.Order("shot_at DESC")
	}

	// 分页条件
	offset := (condition.Page - 1) * condition.PageSize
	err := query.Offset(offset).Limit(condition.PageSize).Find(&videos).Error

	return videos, err
}

func (r *Repository) CountVideo(condition model.SearchVideoCondition) (int64, error) {
	var count int64

	query := r.DB.Model(&model.Video{})

	query = applySearchVideoCondition(query, condition)
	err := query.Count(&count).Error

	return count, err
}

func (r *Repository) GetVideoByID(videoID uint) (*model.Video, error) {
	var video model.Video
	if err := r.DB.Where("ID = ?", videoID).First(&video).Error; err != nil {
		return nil, err
	}
	return &video, nil
}

func (r *Repository) UpdateVideoThumbPath(videoID uint, thumbPath string) error {
	return r.DB.Model(&model.Video{}).Where("ID = ?", videoID).Update("thumb_path", thumbPath).Error
}

func (r *Repository) GetAllVideo() ([]model.Video, error) {
	var videos []model.Video
	err := r.DB.Find(&videos).Error
	return videos, err
}

func applySearchVideoCondition(query *gorm.DB, condition model.SearchVideoCondition) *gorm.DB {
	var conditions []string
	var args []interface{}

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
