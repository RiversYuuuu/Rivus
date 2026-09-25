package repository

import (
	"Rivus/internal/model"

	"gorm.io/gorm"
)

func (r *Repository) CreateImage(image *model.Image) error {
	return r.DB.Create(image).Error
}

func (r *Repository) SearchImage(condition model.SearchImageCondition) ([]model.Image, error) {
	var images []model.Image

	query := r.DB.Model(&model.Image{})

	query = applySearchImageCondition(query, condition)

	// 排序条件
	if condition.SortBy != "" {
		query = query.Order(condition.SortBy + " " + condition.SortOrder)
	} else {
		query = query.Order("shot_at DESC")
	}

	// 分页条件
	offset := (condition.Page - 1) * condition.PageSize
	err := query.Offset(offset).Limit(condition.PageSize).Find(&images).Error

	return images, err
}

func (r *Repository) CountImage(condition model.SearchImageCondition) (int64, error) {
	var count int64

	query := r.DB.Model(&model.Image{})

	query = applySearchImageCondition(query, condition)
	err := query.Count(&count).Error

	return count, err
}

func (r *Repository) GetImageByID(imageID uint) (*model.Image, error) {
	var image model.Image
	if err := r.DB.Where("ID = ?", imageID).First(&image).Error; err != nil {
		return nil, err
	}
	return &image, nil
}

func (r *Repository) UpdateImageThumbPath(imageID uint, thumbPath string) error {
	return r.DB.Model(&model.Image{}).Where("ID = ?", imageID).Update("thumb_path", thumbPath).Error
}

func (r *Repository) GetAllImage() ([]model.Image, error) {
	var images []model.Image
	err := r.DB.Find(&images).Error
	return images, err
}

func applySearchImageCondition(query *gorm.DB, condition model.SearchImageCondition) *gorm.DB {
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

func (r *Repository) SoftDeleteImageByID(imageID uint) error {
	return r.DB.Delete(&model.Image{}, imageID).Error
}

func (r *Repository) HardDeleteImageByID(imageID uint) error {
	return r.DB.Unscoped().Delete(&model.Image{}, imageID).Error
}

func (r *Repository) RestoreImageByID(imageID uint) error {
	return r.DB.Unscoped().Model(&model.Image{}).Where("ID = ?", imageID).Update("deleted_at", nil).Error
}

func (r *Repository) SearchImageFromRecycleBin(condition model.SearchImageCondition) ([]model.Image, error) {
	var images []model.Image

	query := r.DB.Unscoped().Model(&model.Image{})

	query = query.Where("deleted_at IS NOT NULL")

	// 排序条件
	if condition.SortBy != "" {
		query = query.Order(condition.SortBy + " " + condition.SortOrder)
	} else {
		query = query.Order("shot_at DESC")
	}

	// 分页条件
	offset := (condition.Page - 1) * condition.PageSize
	err := query.Offset(offset).Limit(condition.PageSize).Find(&images).Error

	return images, err
}

func (r *Repository) CountImageFromRecycleBin(condition model.SearchImageCondition) (int64, error) {
	var count int64

	query := r.DB.Unscoped().Model(&model.Image{})

	query = query.Where("deleted_at IS NOT NULL")

	err := query.Count(&count).Error

	return count, err
}

func (r *Repository) GetImageByIDFromRecycleBin(imageID uint) (*model.Image, error) {
	var image model.Image
	if err := r.DB.Unscoped().Where("ID = ? AND deleted_at IS NOT NULL", imageID).First(&image).Error; err != nil {
		return nil, err
	}
	return &image, nil
}