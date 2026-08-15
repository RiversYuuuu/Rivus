package logic

import (
	"os"
	"path/filepath"

	"go.senan.xyz/taglib"

	generated "MultiMediaManager/internal/generated"
	"MultiMediaManager/internal/model"
	"MultiMediaManager/internal/tool"
)

// ScanAudioLogic 扫描音频目录，构建音频元数据
type ScanAudioLogic struct {
	*Logic
}

func NewScanAudioLogic(l *Logic) *ScanAudioLogic {
	return &ScanAudioLogic{Logic: l}
}

// ScanAudio 扫描音频目录，构建音频元数据
func (l *ScanAudioLogic) ScanAudio() (*generated.ScanAudioResponse, error) {
	config, err := l.Repo.GetConfig()
	if err != nil {
		l.Logger.Error("Failed to get config", "error", err)
		return nil, err
	}

	audioDir := config.AudioDir
	if audioDir == "" {
		l.Logger.Warn("audio dir not configured")
		return &generated.ScanAudioResponse{Code: 1, Message: "audio dir not configured"}, nil
	}

	audioFiles, err := l.scanAudioFiles(audioDir)
	if err != nil {
		l.Logger.Error("Failed to scan audio files", "error", err, "dir", audioDir)
		return nil, err
	}

	for _, filePath := range audioFiles {
		audio := l.buildAudio(filePath)
		// 检查是否存在相同MD5的记录
		res, err := l.Repo.SearchAudio(model.SearchAudioCondition{
			Page:      1,
			PageSize:  1,
			SortBy:    "ID",
			SortOrder: "asc",
			MD5:       audio.MD5,
		})
		if err != nil {
			l.Logger.Warn("Failed to search audio record", "error", err, "path", filePath)
			continue
		}
		if len(res) > 0 {
			l.Logger.Info("Audio record already exists", "path", filePath)
			continue
		}
		if err := l.Repo.CreateAudio(audio); err != nil {
			l.Logger.Warn("Failed to save audio record", "error", err, "path", filePath)
		}
	}

	l.Logger.Info("Audio scan completed", "count", len(audioFiles))
	return &generated.ScanAudioResponse{Code: 0, Message: "success"}, nil
}

// buildAudio 构造一首歌曲对象
func (l *ScanAudioLogic) buildAudio(filePath string) *model.Audio {
	audio := &model.Audio{}

	l.buildFileInfo(audio, filePath)
	l.buildTagInfo(audio, filePath)
	l.buildRelatedFiles(audio)

	return audio
}

// buildFileInfo 填充文件基础信息：FilePath, FileExt, FileSize, MD5
func (l *ScanAudioLogic) buildFileInfo(audio *model.Audio, filePath string) {
	audio.FilePath = filePath
	audio.FileExt = filepath.Ext(filePath)

	info, err := os.Stat(filePath)
	if err != nil {
		l.Logger.Warn("Failed to get file info", "error", err, "path", filePath)
		return
	}
	audio.FileSize = info.Size()

	hash, err := tool.ComputeMD5(filePath)
	if err != nil {
		l.Logger.Warn("Failed to compute MD5 hash", "error", err, "path", filePath)
		return
	}
	audio.MD5 = hash
}

// buildTagInfo 填充标签信息：Title, Artist, Album, Duration
func (l *ScanAudioLogic) buildTagInfo(audio *model.Audio, filePath string) {
	tags, err := taglib.ReadTags(filePath)
	if err != nil {
		l.Logger.Warn("Failed to read tag", "error", err, "path", filePath)
		return
	}

	if len(tags[taglib.Title]) > 0 {
		audio.Title = tags[taglib.Title][0]
	}
	if len(tags[taglib.Artist]) > 0 {
		audio.Artist = tags[taglib.Artist][0]
	}
	if len(tags[taglib.Album]) > 0 {
		audio.Album = tags[taglib.Album][0]
	}

	props, err := taglib.ReadProperties(filePath)
	if err != nil {
		l.Logger.Warn("Failed to read properties", "error", err, "path", filePath)
		return
	}
	audio.Duration = props.Length.Seconds()
}

// buildRelatedFiles 填充关联文件路径：CoverPath, LyricPath
func (l *ScanAudioLogic) buildRelatedFiles(audio *model.Audio) {
	// 初始化关联文件路径为空字符串
	audio.CoverPath = ""
	audio.LyricPath = ""
}

// scanAudioFiles 扫描目录下所有音频文件
func (l *ScanAudioLogic) scanAudioFiles(dir string) ([]string, error) {
	var files []string
	audioExts := map[string]bool{
		".mp3":  true,
		".flac": true,
	}

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		if audioExts[filepath.Ext(path)] {
			files = append(files, path)
		}
		return nil
	})

	return files, err
}
