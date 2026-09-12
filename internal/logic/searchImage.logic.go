package logic

import (
	generated "Rivus/internal/generated"
	"Rivus/internal/model"
	"time"
)

// SearchImageLogic 搜索图片
type SearchImageLogic struct {
	*Logic
}

func NewSearchImageLogic(l *Logic) *SearchImageLogic {
	return &SearchImageLogic{Logic: l}
}

// SearchImage 搜索图片
func (l *SearchImageLogic) SearchImage(params generated.SearchImageParams) (*generated.SearchImageResponse, error) {
	// 构建查询条件
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

	// 查询数据
	images, err := l.Repo.SearchImage(condition)
	if err != nil {
		return nil, err
	}

	// 查询总数
	total, err := l.Repo.CountImage(condition)
	if err != nil {
		return nil, err
	}

	// 转换数据
	items := make([]generated.ImageItem, len(images))
	for i, a := range images {
		id := int(a.ID)
		fileSize := int(a.FileSize)
		shotAt := ""
		if a.ShotAt != nil {
			shotAt = a.ShotAt.Format(time.RFC3339)
		}
		items[i] = generated.ImageItem{
			Id:          &id,
			FilePath:    &a.FilePath,
			FileExt:     &a.FileExt,
			FileSize:    &fileSize,
			FileMd5:     &a.MD5,
			Width:       &a.Width,
			Height:      &a.Height,
			Orientation: &a.Orientation,
			ShotAt:      &shotAt,
			Latitude:    &a.Latitude,
			Longitude:   &a.Longitude,
			CreateTime: func() *string {
				v := a.CreatedAt.Format("2006-01-02 15:04:05")
				return &v
			}(),
			UpdateTime: func() *string {
				v := a.UpdatedAt.Format("2006-01-02 15:04:05")
				return &v
			}(),
		}
		if a.DeletedAt.Valid {
			items[i].DeleteTime = func() *string {
				v := a.DeletedAt.Time.Format("2006-01-02 15:04:05")
				return &v
			}()
		}
	}

	// 计算总页数
	totalPages := int(total) / condition.PageSize
	if int(total)%condition.PageSize > 0 {
		totalPages++
	}

	page := condition.Page
	pageSize := condition.PageSize
	totalInt := int(total)

	return &generated.SearchImageResponse{
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
