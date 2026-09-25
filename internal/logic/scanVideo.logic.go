package logic

import (
	generated "Rivus/internal/generated"
	"Rivus/internal/model"
	"Rivus/internal/tool"
	"os"
	"path/filepath"
	"strings"
)

// ScanVideoLogic 扫描视频目录，构建视频元数据
type ScanVideoLogic struct {
	*Logic
}

func NewScanVideoLogic(l *Logic) *ScanVideoLogic {
	return &ScanVideoLogic{Logic: l}
}

// ScanVideo 扫描视频目录，构建视频元数据
func (l *ScanVideoLogic) ScanVideo() (*generated.ScanVideoResponse, error) {
	config, err := l.Repo.GetConfig()
	if err != nil {
		l.Logger.Error("Failed to get config", "error", err)
		return nil, err
	}

	videoDir := config.VideoDir
	if videoDir == "" {
		l.Logger.Warn("video dir not configured")
		return &generated.ScanVideoResponse{Code: 1, Message: "video dir not configured"}, nil
	}

	videoFiles, err := l.scanVideoFiles(videoDir)
	if err != nil {
		l.Logger.Error("Failed to scan video files", "error", err, "dir", videoDir)
		return nil, err
	}

	for _, filePath := range videoFiles {
		video := l.buildVideo(filePath)
		// 检查是否存在相同MD5的记录
		res, err := l.Repo.SearchVideo(model.SearchVideoCondition{
			Page:      1,
			PageSize:  1,
			SortBy:    "shot_at",
			SortOrder: "asc",
			MD5:       video.MD5,
		})
		if err != nil {
			l.Logger.Warn("Failed to search video record", "error", err, "path", filePath)
			continue
		}
		if len(res) > 0 {
			l.Logger.Info("Video record already exists", "path", filePath)
			continue
		}
		if err := l.Repo.CreateVideo(video); err != nil {
			l.Logger.Warn("Failed to save video record", "error", err, "path", filePath)
		}
	}

	return &generated.ScanVideoResponse{Code: 0, Message: "success"}, nil
}

func (l *ScanVideoLogic) buildVideo(filePath string) *model.Video {
	video := &model.Video{}

	l.buildFileInfo(video, filePath)
	l.buildBasicInfo(video, filePath)
	l.buildExifInfo(video, filePath)

	return video
}

func (l *ScanVideoLogic) buildFileInfo(video *model.Video, filePath string) {
	video.FilePath = filePath
	video.FileExt = filepath.Ext(filePath)

	info, err := os.Stat(filePath)
	if err != nil {
		l.Logger.Warn("Failed to get file info", "error", err, "path", filePath)
		return
	}
	video.FileSize = info.Size()

	mtime := info.ModTime()
	video.ShotAt = &mtime

	hash, err := tool.ComputeMD5(filePath)
	if err != nil {
		l.Logger.Warn("Failed to compute MD5 hash", "error", err, "path", filePath)
		return
	}
	video.MD5 = hash

}

func (l *ScanVideoLogic) buildBasicInfo(video *model.Video, filePath string) {
	// TODO
	return
}

func (l *ScanVideoLogic) buildExifInfo(video *model.Video, filePath string) {
	// TODO
	return
}

func (l *ScanVideoLogic) scanVideoFiles(dir string) ([]string, error) {
	var files []string
	videoExts := map[string]bool{
		".mp4": true,
		".mov": true,
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
		if videoExts[strings.ToLower(filepath.Ext(path))] {
			files = append(files, path)
		}
		return nil
	})

	return files, err
}
