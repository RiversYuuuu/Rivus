package logic

import (
	generated "MultiMediaManager/internal/generated"
	"MultiMediaManager/internal/model"
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

	config := model.Config{
		AudioDir:       audioDir,
		AcoustIDApiKey: acoustidApiKey,
	}

	// 校验音频目录是否存在
	if config.AudioDir != "" {
		if _, err := os.Stat(config.AudioDir); os.IsNotExist(err) {
			l.Logger.Warn("AudioDir not exist, err:", "err", err, "path", config.AudioDir)
			return nil, errors.New("AudioDir not exist")
		}
	}

	err := l.Repo.UpdateConfig(&config)
	if err != nil {
		return nil, err
	}

	return &generated.SetConfigResponse{Code: 0, Message: "success"}, nil
}
