package logic

import (
	generated "Rivus/internal/generated"
	"Rivus/internal/tool"

	"go.senan.xyz/taglib"
)

// UpdateAudioLogic 更新音频
type UpdateAudioLogic struct {
	*Logic
}

func NewUpdateAudioLogic(l *Logic) *UpdateAudioLogic {
	return &UpdateAudioLogic{Logic: l}
}

// UpdateAudio 更新音频
func (l *UpdateAudioLogic) UpdateAudio(req *generated.UpdateAudioRequest) (*generated.UpdateAudioResponse, error) {
	// 获取音频ID
	audioID := req.Id

	// 根据音频ID查询音频
	audio, err := l.Repo.GetAudioByID(uint(*audioID))
	if err != nil {
		return nil, err
	}

	// 更新音频文件元信息
	err = taglib.WriteTags(audio.FilePath, map[string][]string{
		taglib.Title:  {*req.Title},
		taglib.Artist: {*req.Artist},
		taglib.Album:  {*req.Album},
	}, 0)
	if err != nil {
		return nil, err
	}

	// 重新计算音频MD5值
	hash, err := tool.ComputeMD5(audio.FilePath)
	if err != nil {
		return nil, err
	}
	audio.MD5 = hash

	// 更新音频信息
	if req.Title != nil {
		audio.Title = *req.Title
	}
	if req.Artist != nil {
		audio.Artist = *req.Artist
	}
	if req.Album != nil {
		audio.Album = *req.Album
	}

	// 更新音频
	err = l.Repo.UpdateAudio(audio)
	if err != nil {
		return nil, err
	}

	return &generated.UpdateAudioResponse{Code: 0, Message: "success"}, nil
}
