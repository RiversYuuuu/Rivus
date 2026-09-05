package logic

import (
	generated "Rivus/internal/generated"
	"Rivus/internal/model"
	"errors"
	"os"
)

// SetConfigLogic 配置接口
type SetConfigLogic struct {
	*Logic
}

func NewSetConfigLogic(l *Logic) *SetConfigLogic {
	return &SetConfigLogic{Logic: l}
}

// SetConfig 配置接口
func (l *SetConfigLogic) SetConfig(req *generated.SetConfigRequest) (*generated.SetConfigResponse, error) {

	var audioDir string
	if req.AudioDir != nil {
		audioDir = *req.AudioDir
	}
	var acoustidApiKey string
	if req.AcoustidApiKey != nil {
		acoustidApiKey = *req.AcoustidApiKey
	}
	var imageDir string
	if req.ImageDir != nil {
		imageDir = *req.ImageDir
	}

	config := model.Config{
		AudioDir:       audioDir,
		AcoustIDApiKey: acoustidApiKey,
		ImageDir:       imageDir,
	}

	// 校验音频目录是否存在
	if config.AudioDir != "" {
		if _, err := os.Stat(config.AudioDir); os.IsNotExist(err) {
			l.Logger.Warn("AudioDir not exist, err:", "err", err, "path", config.AudioDir)
			return nil, errors.New("AudioDir not exist")
		}
	}

	// 校验图片目录是否存在
	if config.ImageDir != "" {
		if _, err := os.Stat(config.ImageDir); os.IsNotExist(err) {
			l.Logger.Warn("ImageDir not exist, err:", "err", err, "path", config.ImageDir)
			return nil, errors.New("ImageDir not exist")
		}
	}

	err := l.Repo.UpdateConfig(&config)
	if err != nil {
		return nil, err
	}

	return &generated.SetConfigResponse{Code: 0, Message: "success"}, nil
}
