package logic

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/disintegration/imaging"

	generated "Rivus/internal/generated"
)

// GetImageThumb 获取图片缩略图
type GetImageThumbLogic struct {
	*Logic
}

func NewGetImageThumbLogic(l *Logic) *GetImageThumbLogic {
	return &GetImageThumbLogic{Logic: l}
}

// GetImageThumb 获取图片缩略图
func (l *GetImageThumbLogic) GetImageThumb(params generated.GetImageThumbParams) (string, string, error) {
	image, err := l.Repo.GetImageByID(uint(params.Id))
	if err != nil {
		return "", "", fmt.Errorf("image not found: %w", err)
	}

	if image.ThumbPath != "" {
		if _, err := os.Stat(image.ThumbPath); err == nil {
			return image.ThumbPath, "image/jpeg", nil
		}
	}

	config, err := l.Repo.GetConfig()
	if err != nil {
		return "", "", fmt.Errorf("failed to get config: %w", err)
	}

	thumbDir := filepath.Join(config.ImageDir, ".thumb")
	if err := os.MkdirAll(thumbDir, 0755); err != nil {
		return "", "", fmt.Errorf("failed to create thumb dir: %w", err)
	}

	thumbPath := filepath.Join(thumbDir, fmt.Sprintf("%s.jpg", image.MD5))

	// 打开原图，并按 EXIF 朝向自动转正
	src, err := imaging.Open(image.FilePath, imaging.AutoOrientation(true))
	if err != nil {
		return "", "", fmt.Errorf("failed to open image: %w", err)
	}

	// 短边缩到 300，再居中裁成 300x300
	thumb := imaging.Fill(src, 300, 300, imaging.Center, imaging.Lanczos)

	// 统一存为 JPEG，质量 75
	if err := imaging.Save(thumb, thumbPath, imaging.JPEGQuality(75)); err != nil {
		return "", "", fmt.Errorf("failed to save thumb: %w", err)
	}

	if err := l.Repo.UpdateImageThumbPath(image.ID, thumbPath); err != nil {
		l.Logger.Warn("Failed to update thumb path", "error", err, "imageID", image.ID)
	}

	return thumbPath, "image/jpeg", nil
}
