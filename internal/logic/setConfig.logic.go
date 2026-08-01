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

	// 转换为模型
	config := model.Config{
		AudioDir: *req.AudioDir,
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
