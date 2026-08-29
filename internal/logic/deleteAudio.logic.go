package logic

import (
	generated "Rivus/internal/generated"
	"errors"
	"os"
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
	if req.Hard != nil && *req.Hard == true {
		for _, audioID := range *req.Ids {
			// 检查音频是否存在
			audio, err := l.Repo.GetAudioByIDFromRecycleBin(uint(audioID))
			if err != nil {
				return nil, err
			}
			if audio == nil {
				return nil, errors.New("The audio does not exist in the recycle bin")
			}
			// 获取音频文件路径
			audioPath := audio.FilePath
			// 删除音频文件
			if err := os.Remove(audioPath); err != nil {
				return nil, err
			}
			l.Repo.HardDeleteAudioByID(uint(audioID))
		}
	} else {
		for _, audioID := range *req.Ids {
			l.Repo.SoftDeleteAudioByID(uint(audioID))
		}
	}

	return &generated.DeleteAudioResponse{
		Code:    0,
		Message: "success",
	}, nil
}
