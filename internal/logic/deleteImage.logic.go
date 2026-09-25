package logic

import (
	generated "Rivus/internal/generated"
	"errors"
	"os"
)

// DeleteImageLogic 删除图片
type DeleteImageLogic struct {
	*Logic
}

func NewDeleteImageLogic(l *Logic) *DeleteImageLogic {
	return &DeleteImageLogic{Logic: l}
}

// DeleteImage 删除图片
func (l *DeleteImageLogic) DeleteImage(req *generated.DeleteImageRequest) (*generated.DeleteImageResponse, error) {
	if req.Hard != nil && *req.Hard == true {
		for _, imageID := range *req.Ids {
			// 检查图片是否存在
			image, err := l.Repo.GetImageByIDFromRecycleBin(uint(imageID))
			if err != nil {
				return nil, err
			}
			if image == nil {
				return nil, errors.New("The image does not exist in the recycle bin")
			}
			// 获取图片文件路径
			imagePath := image.FilePath
			// 删除图片文件
			if err := os.Remove(imagePath); err != nil {
				return nil, err
			}
			l.Repo.HardDeleteImageByID(uint(imageID))
		}
	} else {
		for _, imageID := range *req.Ids {
			l.Repo.SoftDeleteImageByID(uint(imageID))
		}
	}

	return &generated.DeleteImageResponse{
		Code:    0,
		Message: "success",
	}, nil
}
