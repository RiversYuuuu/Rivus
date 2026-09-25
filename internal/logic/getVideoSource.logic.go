package logic

import (
	"fmt"
	"strings"

	generated "Rivus/internal/generated"
)

type GetVideoSourceLogic struct {
	*Logic
}

func NewGetVideoSourceLogic(l *Logic) *GetVideoSourceLogic {
	return &GetVideoSourceLogic{Logic: l}
}

// GetVideoSource 获取视频文件
func (l *GetVideoSourceLogic) GetVideoSource(params generated.GetVideoSourceParams) (string, string, error) {
	video, err := l.Repo.GetVideoByID(uint(params.Id))
	if err != nil {
		return "", "", fmt.Errorf("video not found: %w", err)
	}
	return video.FilePath, videoMimeByExt(video.FileExt), nil
}

func videoMimeByExt(ext string) string {
	ext = strings.ToLower(strings.TrimLeft(ext, "."))
	switch ext {
	case "mp4":
		return "video/mp4"
	case "mov":
		return "video/quicktime"
	default:
		return "video/mp4"
	}
}
