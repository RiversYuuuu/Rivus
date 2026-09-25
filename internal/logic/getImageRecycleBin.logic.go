package logic

import (
	generated "Rivus/internal/generated"
	"Rivus/internal/model"
)

// GetImageRecycleBinLogic 获取回收站图片
type GetImageRecycleBinLogic struct {
	*Logic
}

func NewGetImageRecycleBinLogic(l *Logic) *GetImageRecycleBinLogic {
	return &GetImageRecycleBinLogic{Logic: l}
}

// GetImageRecycleBin 获取回收站图片
func (l *GetImageRecycleBinLogic) GetImageRecycleBin(params generated.GetImageRecycleBinParams) (*generated.GetImageRecycleBinResponse, error) {
	condition := model.SearchImageCondition{
		Page:      1,
		PageSize:  10,
		SortBy:    "shot_at",
		SortOrder: "desc",
	}

	if params.Page != nil {
		condition.Page = *params.Page
	}
	if params.PageSize != nil {
		condition.PageSize = *params.PageSize
	}
	if params.SortBy != nil {
		condition.SortBy = string(*params.SortBy)
	}
	if params.SortOrder != nil {
		condition.SortOrder = string(*params.SortOrder)
	}

	images, err := l.Repo.SearchImageFromRecycleBin(condition)
	if err != nil {
		return nil, err
	}

	total, err := l.Repo.CountImageFromRecycleBin(condition)
	if err != nil {
		return nil, err
	}

	items := make([]generated.ImageItem, len(images))
	for i, img := range images {
		id := int(img.ID)
		fileSize := int(img.FileSize)
		width := img.Width
		height := img.Height
		orientation := img.Orientation
		latitude := img.Latitude
		longitude := img.Longitude
		items[i] = generated.ImageItem{
			Id:          &id,
			FilePath:    &img.FilePath,
			FileExt:     &img.FileExt,
			FileSize:    &fileSize,
			FileMd5:     &img.MD5,
			Width:       &width,
			Height:      &height,
			Orientation: &orientation,
			Latitude:    &latitude,
			Longitude:   &longitude,
			CreateTime: func() *string {
				v := img.CreatedAt.Format("2006-01-02 15:04:05")
				return &v
			}(),
			UpdateTime: func() *string {
				v := img.UpdatedAt.Format("2006-01-02 15:04:05")
				return &v
			}(),
		}
		if img.ShotAt != nil {
			items[i].ShotAt = func() *string {
				v := img.ShotAt.Format("2006-01-02T15:04:05Z")
				return &v
			}()
		}
		if img.DeletedAt.Valid {
			items[i].DeleteTime = func() *string {
				v := img.DeletedAt.Time.Format("2006-01-02 15:04:05")
				return &v
			}()
		}
	}

	totalPages := int(total) / condition.PageSize
	if int(total)%condition.PageSize > 0 {
		totalPages++
	}

	page := condition.Page
	pageSize := condition.PageSize
	totalInt := int(total)

	return &generated.GetImageRecycleBinResponse{
		Code:    0,
		Message: "success",
		Data: struct {
			ImageList  *[]generated.ImageItem `json:"image_list,omitempty"`
			Pagination *generated.Pagination  `json:"pagination,omitempty"`
		}{
			ImageList: &items,
			Pagination: &generated.Pagination{
				Page:       &page,
				PageSize:   &pageSize,
				Total:      &totalInt,
				TotalPages: &totalPages,
			},
		},
	}, nil
}
