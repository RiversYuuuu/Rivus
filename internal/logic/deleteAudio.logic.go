package logic

import (
	generated "MultiMediaManager/internal/generated"
)

// DeleteAudioLogic 删除音频
type DeleteAudioLogic struct {
	*Logic
}

func NewDeleteAudioLogic(l *Logic) *DeleteAudioLogic {
	return &DeleteAudioLogic{Logic: l}
}

// DeleteAudio 删除音频
func (l *DeleteAudioLogic) DeleteAudio(req *generated.DeleteAudioRequest) (*generated.DeleteAudioResponse, error) {
	for _, audioID := range *req.Ids {
		l.Repo.DeleteAudioByID(uint(audioID))
	}

	return &generated.DeleteAudioResponse{
		Code:    0,
		Message: "success",
	}, nil
}
