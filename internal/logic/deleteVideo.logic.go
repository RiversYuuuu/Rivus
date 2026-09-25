package logic

import (
	generated "Rivus/internal/generated"
	"errors"
	"os"
)

// DeleteVideoLogic 删除视频
type DeleteVideoLogic struct {
	*Logic
}

func NewDeleteVideoLogic(l *Logic) *DeleteVideoLogic {
	return &DeleteVideoLogic{Logic: l}
}

// DeleteVideo 删除视频
func (l *DeleteVideoLogic) DeleteVideo(req *generated.DeleteVideoRequest) (*generated.DeleteVideoResponse, error) {
	if req.Hard != nil && *req.Hard == true {
		for _, videoID := range *req.Ids {
			// 检查视频是否存在
			video, err := l.Repo.GetVideoByIDFromRecycleBin(uint(videoID))
			if err != nil {
				return nil, err
			}
			if video == nil {
				return nil, errors.New("The video does not exist in the recycle bin")
			}
			// 获取视频文件路径
			videoPath := video.FilePath
			// 删除视频文件
			if err := os.Remove(videoPath); err != nil {
				return nil, err
			}
			l.Repo.HardDeleteVideoByID(uint(videoID))
		}
	} else {
		for _, videoID := range *req.Ids {
			l.Repo.SoftDeleteVideoByID(uint(videoID))
		}
	}

	return &generated.DeleteVideoResponse{
		Code:    0,
		Message: "success",
	}, nil
}
