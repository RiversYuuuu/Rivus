package logic

import (
	generated "Rivus/internal/generated"
	"Rivus/internal/model"
	"Rivus/internal/tool"
	stdimage "image"
	_ "image/jpeg"
	_ "image/png"
	"os"
	"path/filepath"

	"github.com/evanoberholster/imagemeta"
)

// ScanImageLogic 扫描图片目录，构建图片元数据
type ScanImageLogic struct {
	*Logic
}

func NewScanImageLogic(l *Logic) *ScanImageLogic {
	return &ScanImageLogic{Logic: l}
}

// ScanImage 扫描图片目录，构建图片元数据
func (l *ScanImageLogic) ScanImage() (*generated.ScanImageResponse, error) {
	config, err := l.Repo.GetConfig()
	if err != nil {
		l.Logger.Error("Failed to get config", "error", err)
		return nil, err
	}

	imageDir := config.ImageDir
	if imageDir == "" {
		l.Logger.Warn("image dir not configured")
		return &generated.ScanImageResponse{Code: 1, Message: "image dir not configured"}, nil
	}

	imageFiles, err := l.scanImageFiles(imageDir)
	if err != nil {
		l.Logger.Error("Failed to scan image files", "error", err, "dir", imageDir)
		return nil, err
	}

	for _, filePath := range imageFiles {
		image := l.buildImage(filePath)
		// 检查是否存在相同MD5的记录
		res, err := l.Repo.SearchImage(model.SearchImageCondition{
			Page:      1,
			PageSize:  1,
			SortBy:    "shot_at",
			SortOrder: "asc",
			MD5:       image.MD5,
		})
		if err != nil {
			l.Logger.Warn("Failed to search audio record", "error", err, "path", filePath)
			continue
		}
		if len(res) > 0 {
			l.Logger.Info("Audio record already exists", "path", filePath)
			continue
		}
		if err := l.Repo.CreateImage(image); err != nil {
			l.Logger.Warn("Failed to save image record", "error", err, "path", filePath)
		}
	}

	return &generated.ScanImageResponse{Code: 0, Message: "success"}, nil
}

func (l *ScanImageLogic) buildImage(filePath string) *model.Image {
	image := &model.Image{}

	l.buildFileInfo(image, filePath)
	l.buildBasicInfo(image, filePath)
	l.buildExifInfo(image, filePath)

	return image
}

func (l *ScanImageLogic) buildFileInfo(image *model.Image, filePath string) {
	image.FilePath = filePath
	image.FileExt = filepath.Ext(filePath)

	info, err := os.Stat(filePath)
	if err != nil {
		l.Logger.Warn("Failed to get file info", "error", err, "path", filePath)
		return
	}
	image.FileSize = info.Size()

	mtime := info.ModTime()
	image.ShotAt = &mtime

	hash, err := tool.ComputeMD5(filePath)
	if err != nil {
		l.Logger.Warn("Failed to compute MD5 hash", "error", err, "path", filePath)
		return
	}
	image.MD5 = hash

}

func (l *ScanImageLogic) buildBasicInfo(image *model.Image, filePath string) {
	f, err := os.Open(filePath)
	if err != nil {
		l.Logger.Warn("Failed to open image", "error", err, "path", filePath)
		return
	}
	defer f.Close()

	cfg, _, err := stdimage.DecodeConfig(f)
	if err != nil {
		l.Logger.Warn("Failed to decode image config", "error", err, "path", filePath)
		return
	}
	image.Width = cfg.Width
	image.Height = cfg.Height
}

func (l *ScanImageLogic) buildExifInfo(image *model.Image, filePath string) {
	// 默认朝向：1（正常），无 EXIF 时也保持这个值
	image.Orientation = 1

	f, err := os.Open(filePath)
	if err != nil {
		l.Logger.Warn("Failed to open image for exif", "error", err, "path", filePath)
		return
	}
	defer f.Close()

	ex, err := imagemeta.Decode(f)
	if err != nil {
		// 没有 EXIF 的图片（截图、网图等）正常返回，不报错
		return
	}

	// 如果获取到拍摄时间早于文件修改时间，才更新拍摄时间
	if !ex.SelectedDate().IsZero() && ex.SelectedDate().Before(*image.ShotAt) {
		t := ex.SelectedDate()
		image.ShotAt = &t
	}

	// 朝向（EXIF 有效值 1-8，0 表示未设置）
	if ex.IFD0.Orientation != 0 {
		image.Orientation = int(ex.IFD0.Orientation)
	}

	// GPS
	lat := ex.GPS.Latitude()
	lon := ex.GPS.Longitude()
	if lat != 0 || lon != 0 {
		image.Latitude = lat
		image.Longitude = lon
	}
}

func (l *ScanImageLogic) scanImageFiles(dir string) ([]string, error) {
	var files []string
	imageExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".heic": true,
	}

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		l.Logger.Debug("Scanning file", "path", path)
		if err != nil {
			return err
		}
		if info.IsDir() {
			if info.Name() == ".thumb" {
				return filepath.SkipDir
			}
			return nil
		}
		if imageExts[filepath.Ext(path)] {
			files = append(files, path)
		}
		return nil
	})

	return files, err
}
