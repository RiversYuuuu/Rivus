package logic

import (
	generated "Rivus/internal/generated"
	"Rivus/internal/model"
)

// GetRecycleBinLogic 获取回收站音频
type GetRecycleBinLogic struct {
	*Logic
}

func NewGetRecycleBinLogic(l *Logic) *GetRecycleBinLogic {
	return &GetRecycleBinLogic{Logic: l}
}

// GetRecycleBin 获取回收站音频
func (l *GetRecycleBinLogic) GetRecycleBin(params generated.GetRecycleBinParams) (*generated.GetRecycleBinResponse, error) {
	condition := model.SearchAudioCondition{
		Page:      1,
		PageSize:  10,
		SortBy:    "title",
		SortOrder: "asc",
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
	audios, err := l.Repo.SearchAudioFromRecycleBin(condition)
	if err != nil {
		return nil, err
	}

	// 查询总数
	total, err := l.Repo.CountAudioFromRecycleBin(condition)
	if err != nil {
		return nil, err
	}

	// 转换数据
	items := make([]generated.AudioItem, len(audios))
	for i, a := range audios {
		id := int(a.ID)
		fileSize := int(a.FileSize)
		duration := float32(a.Duration)
		items[i] = generated.AudioItem{
			Id:        &id,
			Title:     &a.Title,
			Artist:    &a.Artist,
			Album:     &a.Album,
			Duration:  &duration,
			FilePath:  &a.FilePath,
			FileExt:   &a.FileExt,
			FileSize:  &fileSize,
			FileMd5:   &a.MD5,
			CoverPath: &a.CoverPath,
			LyricPath: &a.LyricPath,
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

	return &generated.GetRecycleBinResponse{
		Code:    0,
		Message: "success",
		Data: struct {
			AudioList  *[]generated.AudioItem `json:"audio_list,omitempty"`
			Pagination *generated.Pagination  `json:"pagination,omitempty"`
		}{
			AudioList: &items,
			Pagination: &generated.Pagination{
				Page:       &page,
				PageSize:   &pageSize,
				Total:      &totalInt,
				TotalPages: &totalPages,
			},
		},
	}, nil

}
