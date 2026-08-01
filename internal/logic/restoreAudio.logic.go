package logic

import (
	generated "MultiMediaManager/internal/generated"
	"strconv"
)

// RestoreAudioLogic 恢复音频
type RestoreAudioLogic struct {
	*Logic
}

func NewRestoreAudioLogic(l *Logic) *RestoreAudioLogic {
	return &RestoreAudioLogic{Logic: l}
}

// RestoreAudio 恢复音频
func (l *RestoreAudioLogic) RestoreAudio(req *generated.RestoreAudioRequest) (*generated.RestoreAudioResponse, error) {

	message := ""
	// 恢复音频
	for _, audioID := range *req.Ids {
		err := l.Repo.RestoreAudioByID(uint(audioID))
		if err != nil {
			message += "Failed to restore audio, ID: " + strconv.Itoa(int(audioID)) + ", Error: " + err.Error() + "\n"
		}
	}

	if message == "" {
		message = "success"
	}

	return &generated.RestoreAudioResponse{
		Code:    0,
		Message: message,
	}, nil
}
