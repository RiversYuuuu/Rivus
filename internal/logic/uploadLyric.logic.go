package logic

import (
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"

	generated "MultiMediaManager/internal/generated"
	"MultiMediaManager/internal/tool"
)

type UploadLyricLogic struct {
	*Logic
}

func NewUploadLyricLogic(l *Logic) *UploadLyricLogic {
	return &UploadLyricLogic{Logic: l}
}

// UploadLyric 上传歌词文件
func (l *UploadLyricLogic) UploadLyric(audioID uint, fileHeader *multipart.FileHeader) (*generated.UploadResponse, error) {
	audio, err := l.Repo.GetAudioByID(audioID)
	if err != nil {
		l.Logger.Error("Failed to get audio record", "error", err, "id", audioID)
		return nil, fmt.Errorf("audio not found: %w", err)
	}

	config, err := l.Repo.GetConfig()
	if err != nil {
		l.Logger.Error("Failed to get config", "error", err)
		return nil, fmt.Errorf("failed to get config: %w", err)
	}

	lyricDir := filepath.Join(config.AudioDir, ".lyric")
	if err := os.MkdirAll(lyricDir, 0755); err != nil {
		l.Logger.Error("Failed to create lyric dir", "error", err, "path", lyricDir)
		return nil, fmt.Errorf("failed to create lyric dir: %w", err)
	}

	title := audio.Title
	if title == "" {
		title = fmt.Sprintf("song_%d", audioID)
	}
	lyricPath := filepath.Join(lyricDir, title+".lrc")

	if err := tool.SaveFile(fileHeader, lyricPath); err != nil {
		l.Logger.Error("Failed to save lyric file", "error", err, "path", lyricPath)
		return nil, fmt.Errorf("failed to save lyric file: %w", err)
	}

	audio.LyricPath = lyricPath
	if err := l.Repo.UpdateAudio(audio); err != nil {
		l.Logger.Warn("Failed to update audio lyric path", "error", err, "id", audioID)
	}

	l.Logger.Info("Lyric uploaded", "path", lyricPath, "audio_id", audioID)
	return &generated.UploadResponse{Code: 0, Message: "success"}, nil
}
