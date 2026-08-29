package logic

import (
	generated "MultiMediaManager/internal/generated"
	"MultiMediaManager/internal/tool"
)

// FetchLyricLogic 拉取歌词
type FetchLyricLogic struct {
	*Logic
}

func NewFetchLyricLogic(l *Logic) *FetchLyricLogic {
	return &FetchLyricLogic{Logic: l}
}

// FetchLyric 拉取歌词
func (l *FetchLyricLogic) FetchLyric(params generated.FetchLyricParams) (*generated.FetchLyricResponse, error) {
	// 获取数据库记录
	audio, err := l.Repo.GetAudioByID(uint(params.Id))
	if err != nil {
		l.Logger.Error("GetAudioByID failed", "err", err, "id", params.Id)
		return nil, err
	}

	// 从LRCLIB拉取歌词
	syncedLyrics, _, err := tool.GetLyricsFromLRCLIB(audio.Artist, audio.Title, audio.Album, audio.Duration)
	if err != nil || syncedLyrics == "" {
		l.Logger.Warn("GetLyricsFromLRCLIB failed", "err", err, "id", params.Id)
		// 尝试不带专辑名称和时长拉取歌词
		syncedLyrics, _, err = tool.GetLyricsFromLRCLIB(audio.Artist, audio.Title, "", 0)
		if err != nil {
			l.Logger.Error("GetLyricsFromLRCLIB failed with empty album name and duration", "err", err, "id", params.Id)
			return nil, err
		}
	}

	return &generated.FetchLyricResponse{
		Code:    0,
		Message: "success",
		Data: &struct {
			SyncedLyrics *string `json:"synced_lyrics,omitempty"`
		}{
			SyncedLyrics: &syncedLyrics,
		},
	}, nil
}
