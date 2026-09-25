package logic

import (
	generated "Rivus/internal/generated"
	"Rivus/internal/model"
	"time"
)

// SearchVideoLogic 搜索图片
type SearchVideoLogic struct {
	*Logic
}

func NewSearchVideoLogic(l *Logic) *SearchVideoLogic {
	return &SearchVideoLogic{Logic: l}
}

// SearchVideo 搜索图片
func (l *SearchVideoLogic) SearchVideo(params generated.SearchVideoParams) (*generated.SearchVideoResponse, error) {
	// 构建查询条件
	condition := model.SearchVideoCondition{
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
	videos, err := l.Repo.SearchVideo(condition)
	if err != nil {
		return nil, err
	}

	// 查询总数
	total, err := l.Repo.CountVideo(condition)
	if err != nil {
		return nil, err
	}

	// 转换数据
	items := make([]generated.VideoItem, len(videos))
	for i, a := range videos {
		id := int(a.ID)
		fileSize := int(a.FileSize)
		shotAt := ""
		if a.ShotAt != nil {
			shotAt = a.ShotAt.Format(time.RFC3339)
		}
		items[i] = generated.VideoItem{
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

	return &generated.SearchVideoResponse{
		Code:    0,
		Message: "success",
		Data: struct {
			Pagination *generated.Pagination  `json:"pagination,omitempty"`
			VideoList  *[]generated.VideoItem `json:"video_list,omitempty"`
		}{
			Pagination: &generated.Pagination{
				Page:       &page,
				PageSize:   &pageSize,
				Total:      &totalInt,
				TotalPages: &totalPages,
			},
			VideoList: &items,
		},
	}, nil
}
