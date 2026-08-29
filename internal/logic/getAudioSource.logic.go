package logic

import (
	"fmt"
	"strings"

	generated "Rivus/internal/generated"
)

type GetAudioSourceLogic struct {
	*Logic
}

func NewGetAudioSourceLogic(l *Logic) *GetAudioSourceLogic {
	return &GetAudioSourceLogic{Logic: l}
}

// GetAudioSource 获取音频文件
func (l *GetAudioSourceLogic) GetAudioSource(params generated.GetAudioSourceParams) (string, string, error) {
	audio, err := l.Repo.GetAudioByID(uint(params.Id))
	if err != nil {
		return "", "", fmt.Errorf("audio not found: %w", err)
	}
	return audio.FilePath, mimeByExt(audio.FileExt), nil
}

func mimeByExt(ext string) string {
	ext = strings.ToLower(strings.TrimLeft(ext, "."))
	switch ext {
	case "mp3":
		return "audio/mpeg"
	case "flac":
		return "audio/flac"
	default:
		return "audio/mpeg"
	}
}
