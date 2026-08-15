package logic

import (
	generated "MultiMediaManager/internal/generated"
	"MultiMediaManager/internal/tool"
)

// ScrapeAudioLogic 刮削音频元数据
type ScrapeAudioLogic struct {
	*Logic
}

func NewScrapeAudioLogic(l *Logic) *ScrapeAudioLogic {
	return &ScrapeAudioLogic{Logic: l}
}

// ScrapeAudio 刮削音频元数据
func (l *ScrapeAudioLogic) ScrapeAudio(params generated.ScrapeAudioParams) (*generated.ScrapeAudioResponse, error) {
	// 获取数据库记录
	audio, err := l.Repo.GetAudioByID(uint(params.Id))
	if err != nil {
		l.Logger.Error("GetAudioByID failed", "err", err, "id", params.Id)
		return nil, err
	}

	// 从配置读取AcoustID API KEY
	config, err := l.Repo.GetConfig()
	if err != nil {
		l.Logger.Error("GetConfig failed", "err", err, "id", params.Id)
		return nil, err
	}
	apiKey := config.AcoustIDApiKey

	// 获取音频AcoustID和时长
	acoustID, duration, err := tool.ComputeAcoustIDAndDuration(audio.FilePath)
	if err != nil {
		l.Logger.Error("ComputeAcoustIDAndDuration failed", "err", err, "id", params.Id)
		return nil, err
	}

	// 根据AcoustID和时长获取MusicBrainz的Recording ID
	musicbrainzRecordingID, err := tool.GetAcoustIDRecordingID(acoustID, duration, apiKey)
	if err != nil {
		l.Logger.Error("GetAcoustIDRecordingID failed", "err", err, "id", params.Id)
		return nil, err
	}

	// 根据MusicBrainz的Recording ID获取元数据
	title, artist, album, err := tool.GetMusicBrainzRecording(musicbrainzRecordingID)
	if err != nil {
		l.Logger.Error("GetMusicBrainzRecording failed", "err", err, "id", params.Id)
		return nil, err
	}

	return &generated.ScrapeAudioResponse{
		Code:    0,
		Message: "success",
		Data: &struct {
			Album  *string `json:"album,omitempty"`
			Artist *string `json:"artist,omitempty"`
			Title  *string `json:"title,omitempty"`
		}{
			Album:  &album,
			Artist: &artist,
			Title:  &title,
		},
	}, nil
}
