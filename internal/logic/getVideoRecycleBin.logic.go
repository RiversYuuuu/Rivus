package logic

import (
	generated "Rivus/internal/generated"
	"Rivus/internal/model"
)

// GetVideoRecycleBinLogic 获取回收站视频
type GetVideoRecycleBinLogic struct {
	*Logic
}

func NewGetVideoRecycleBinLogic(l *Logic) *GetVideoRecycleBinLogic {
	return &GetVideoRecycleBinLogic{Logic: l}
}

// GetVideoRecycleBin 获取回收站视频
func (l *GetVideoRecycleBinLogic) GetVideoRecycleBin(params generated.GetVideoRecycleBinParams) (*generated.GetVideoRecycleBinResponse, error) {
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

	videos, err := l.Repo.SearchVideoFromRecycleBin(condition)
	if err != nil {
		return nil, err
	}

	total, err := l.Repo.CountVideoFromRecycleBin(condition)
	if err != nil {
		return nil, err
	}

	items := make([]generated.VideoItem, len(videos))
	for i, v := range videos {
		id := int(v.ID)
		fileSize := int(v.FileSize)
		width := v.Width
		height := v.Height
		orientation := v.Orientation
		latitude := v.Latitude
		longitude := v.Longitude
		items[i] = generated.VideoItem{
			Id:          &id,
			FilePath:    &v.FilePath,
			FileExt:     &v.FileExt,
			FileSize:    &fileSize,
			FileMd5:     &v.MD5,
			Width:       &width,
			Height:      &height,
			Orientation: &orientation,
			Latitude:    &latitude,
			Longitude:   &longitude,
			CreateTime: func() *string {
				val := v.CreatedAt.Format("2006-01-02 15:04:05")
				return &val
			}(),
			UpdateTime: func() *string {
				val := v.UpdatedAt.Format("2006-01-02 15:04:05")
				return &val
			}(),
		}
		if v.ShotAt != nil {
			items[i].ShotAt = func() *string {
				val := v.ShotAt.Format("2006-01-02T15:04:05Z")
				return &val
			}()
		}
		if v.DeletedAt.Valid {
			items[i].DeleteTime = func() *string {
				val := v.DeletedAt.Time.Format("2006-01-02 15:04:05")
				return &val
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

	return &generated.GetVideoRecycleBinResponse{
		Code:    0,
		Message: "success",
		Data: struct {
			Pagination *generated.Pagination  `json:"pagination,omitempty"`
			VideoList  *[]generated.VideoItem `json:"video_list,omitempty"`
		}{
			VideoList: &items,
			Pagination: &generated.Pagination{
				Page:       &page,
				PageSize:   &pageSize,
				Total:      &totalInt,
				TotalPages: &totalPages,
			},
		},
	}, nil
}
