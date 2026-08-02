package logic

import (
	"fmt"
	"os"

	generated "MultiMediaManager/internal/generated"
)

type GetLyricSourceLogic struct {
	*Logic
}

func NewGetLyricSourceLogic(l *Logic) *GetLyricSourceLogic {
	return &GetLyricSourceLogic{Logic: l}
}

// GetLyricSource 获取歌词文件内容
func (l *GetLyricSourceLogic) GetLyricSource(params generated.GetLyricSourceParams) (string, error) {
	audio, err := l.Repo.GetAudioByID(uint(params.Id))
	if err != nil {
		return "", fmt.Errorf("audio not found: %w", err)
	}

	if audio.LyricPath == "" {
		return "", fmt.Errorf("no lyrics available for this audio")
	}

	data, err := os.ReadFile(audio.LyricPath)
	if err != nil {
		l.Logger.Error("Failed to read lyric file", "error", err, "path", audio.LyricPath)
		return "", fmt.Errorf("failed to read lyric file: %w", err)
	}

	return string(data), nil
}
