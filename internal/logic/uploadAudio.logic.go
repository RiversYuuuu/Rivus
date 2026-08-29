package logic

import (
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strings"

	generated "Rivus/internal/generated"
	"Rivus/internal/model"
	"Rivus/internal/tool"

	"go.senan.xyz/taglib"
)

type UploadAudioLogic struct {
	*Logic
}

func NewUploadAudioLogic(l *Logic) *UploadAudioLogic {
	return &UploadAudioLogic{Logic: l}
}

// UploadAudio 上传音频文件
func (l *UploadAudioLogic) UploadAudio(fileHeader *multipart.FileHeader) (*generated.UploadResponse, error) {
	// 获取音频存储路径
	config, err := l.Repo.GetConfig()
	if err != nil {
		l.Logger.Error("Failed to get config", "error", err)
		return nil, fmt.Errorf("failed to get config: %w", err)
	}

	audioDir := config.AudioDir
	if audioDir == "" {
		return &generated.UploadResponse{Code: 1, Message: "audio dir not configured"}, nil
	}

	audio := l.buildAudio(fileHeader, audioDir)

	// 检查是否存在相同MD5的记录
	res, err := l.Repo.SearchAudio(model.SearchAudioCondition{
		Page:      1,
		PageSize:  1,
		SortBy:    "ID",
		SortOrder: "asc",
		MD5:       audio.MD5,
	})
	if err != nil {
		l.Logger.Warn("Failed to search audio record", "error", err, "path", audio.Title)
		return nil, err
	}
	if len(res) > 0 {
		l.Logger.Info("Audio record already exists", "path", audio.Title)
		return &generated.UploadResponse{Code: 1, Message: "audio record already exists"}, nil
	}

	if err := l.Repo.CreateAudio(audio); err != nil {
		l.Logger.Warn("Failed to save audio record", "error", err, "path", audio.Title)
	}

	return &generated.UploadResponse{Code: 0, Message: "success"}, nil
}

func (l *UploadAudioLogic) buildAudio(fileHeader *multipart.FileHeader, audioDir string) *model.Audio {
	audio := &model.Audio{}

	l.buildFileInfo(audio, fileHeader, audioDir)
	l.buildTagInfo(audio)
	l.buildRelatedFiles(audio)

	return audio
}

func (l *UploadAudioLogic) buildFileInfo(audio *model.Audio, fileHeader *multipart.FileHeader, audioDir string) {
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	audio.FileExt = ext

	if audio.Title == "" {
		audio.FilePath = filepath.Join(audioDir, fileHeader.Filename)
	} else {
		audio.FilePath = filepath.Join(audioDir, audio.Title+audio.FileExt)
	}

	// 保存音频文件到指定目录
	if err := tool.SaveFile(fileHeader, audio.FilePath); err != nil {
		l.Logger.Warn("Failed to save audio file", "error", err, "path", audio.Title)
		return
	}
	hash, err := tool.ComputeMD5(audio.FilePath)
	if err != nil {
		l.Logger.Warn("Failed to compute MD5 hash", "error", err, "path", audio.FilePath)
		return
	}
	audio.MD5 = hash
}

func (l *UploadAudioLogic) buildTagInfo(audio *model.Audio) {
	tags, err := taglib.ReadTags(audio.FilePath)
	if err != nil {
		l.Logger.Warn("Failed to read tag", "error", err, "path", audio.FilePath)
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

	props, err := taglib.ReadProperties(audio.FilePath)
	if err != nil {
		l.Logger.Warn("Failed to read properties", "error", err, "path", audio.FilePath)
		return
	}
	audio.Duration = props.Length.Seconds()
}

func (l *UploadAudioLogic) buildRelatedFiles(audio *model.Audio) {
	// 初始化关联文件路径为空字符串
	audio.CoverPath = ""
	audio.LyricPath = ""
}
