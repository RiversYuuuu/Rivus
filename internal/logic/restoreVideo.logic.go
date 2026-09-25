package logic

import (
	generated "Rivus/internal/generated"
	"strconv"
)

// RestoreVideoLogic 恢复图片
type RestoreVideoLogic struct {
	*Logic
}

func NewRestoreVideoLogic(l *Logic) *RestoreVideoLogic {
	return &RestoreVideoLogic{Logic: l}
}

// RestoreVideo 恢复图片
func (l *RestoreVideoLogic) RestoreVideo(req *generated.RestoreVideoRequest) (*generated.RestoreVideoResponse, error) {

	message := ""
	// 恢复图片
	for _, videoID := range *req.Ids {
		err := l.Repo.RestoreVideoByID(uint(videoID))
		if err != nil {
			message += "Failed to restore video, ID: " + strconv.Itoa(int(videoID)) + ", Error: " + err.Error() + "\n"
		}
	}

	if message == "" {
		message = "success"
	}

	return &generated.RestoreVideoResponse{
		Code:    0,
		Message: message,
	}, nil
}
