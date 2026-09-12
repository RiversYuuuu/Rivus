package logic

import (
	"fmt"
	"strings"

	generated "Rivus/internal/generated"
)

type GetImageSourceLogic struct {
	*Logic
}

func NewGetImageSourceLogic(l *Logic) *GetImageSourceLogic {
	return &GetImageSourceLogic{Logic: l}
}

// GetImageSource 获取图片文件
func (l *GetImageSourceLogic) GetImageSource(params generated.GetImageSourceParams) (string, string, error) {
	image, err := l.Repo.GetImageByID(uint(params.Id))
	if err != nil {
		return "", "", fmt.Errorf("image not found: %w", err)
	}
	return image.FilePath, imageMimeByExt(image.FileExt), nil
}

func imageMimeByExt(ext string) string {
	ext = strings.ToLower(strings.TrimLeft(ext, "."))
	switch ext {
	case "jpg", "jpeg":
		return "image/jpeg"
	case "png":
		return "image/png"
	default:
		return "image/jpeg"
	}
}
