package logic

import (
	generated "Rivus/internal/generated"
	"strconv"
)

// RestoreImageLogic 恢复图片
type RestoreImageLogic struct {
	*Logic
}

func NewRestoreImageLogic(l *Logic) *RestoreImageLogic {
	return &RestoreImageLogic{Logic: l}
}

// RestoreImage 恢复图片
func (l *RestoreImageLogic) RestoreImage(req *generated.RestoreImageRequest) (*generated.RestoreImageResponse, error) {

	message := ""
	// 恢复图片
	for _, imageID := range *req.Ids {
		err := l.Repo.RestoreImageByID(uint(imageID))
		if err != nil {
			message += "Failed to restore image, ID: " + strconv.Itoa(int(imageID)) + ", Error: " + err.Error() + "\n"
		}
	}

	if message == "" {
		message = "success"
	}

	return &generated.RestoreImageResponse{
		Code:    0,
		Message: message,
	}, nil
}
