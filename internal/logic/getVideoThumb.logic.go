package logic

import (
	"fmt"
	"os"
	"path/filepath"

	generated "Rivus/internal/generated"
	"Rivus/internal/tool"
)

type GetVideoThumbLogic struct {
	*Logic
}

func NewGetVideoThumbLogic(l *Logic) *GetVideoThumbLogic {
	return &GetVideoThumbLogic{Logic: l}
}

// GetVideoThumb 获取视频缩略图
func (l *GetVideoThumbLogic) GetVideoThumb(params generated.GetVideoThumbParams) (string, string, error) {
	video, err := l.Repo.GetVideoByID(uint(params.Id))
	if err != nil {
		return "", "", fmt.Errorf("video not found: %w", err)
	}

	if video.ThumbPath != "" {
		if _, err := os.Stat(video.ThumbPath); err == nil {
			return video.ThumbPath, "image/jpeg", nil
		}
	}

	config, err := l.Repo.GetConfig()
	if err != nil {
		return "", "", fmt.Errorf("failed to get config: %w", err)
	}

	thumbDir := filepath.Join(config.VideoDir, ".thumb")
	if err := os.MkdirAll(thumbDir, 0755); err != nil {
		return "", "", fmt.Errorf("failed to create thumb dir: %w", err)
	}

	thumbPath := filepath.Join(thumbDir, fmt.Sprintf("%s.jpg", video.MD5))

	if err := tool.GenerateVideoThumbnail(video.FilePath, thumbPath); err != nil {
		return "", "", fmt.Errorf("failed to generate thumbnail: %w", err)
	}

	if err := l.Repo.UpdateVideoThumbPath(video.ID, thumbPath); err != nil {
		l.Logger.Warn("Failed to update thumb path", "error", err, "videoID", video.ID)
	}

	return thumbPath, "image/jpeg", nil
}
